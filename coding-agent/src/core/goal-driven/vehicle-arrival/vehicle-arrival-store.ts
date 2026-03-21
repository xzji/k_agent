/**
 * 车辆到店监控数据存储
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type {
  VehicleArrivalMonitor,
  TrackingRecord,
  Alert,
  CreateMonitorRequest,
  UpdateTrackingRequest,
  MonitorStatistics,
  MonitorStatus,
} from './vehicle-arrival-types';

/**
 * 车辆到店监控存储类
 */
export class VehicleArrivalStore {
  private monitors: Map<string, VehicleArrivalMonitor>;
  private trackingRecords: Map<string, TrackingRecord[]>;
  private alerts: Map<string, Alert[]>;
  private storagePath: string;
  private monitorsFile: string;
  private trackingRecordsDir: string;
  private alertsFile: string;

  constructor(storagePath?: string) {
    this.storagePath = storagePath || path.join(process.env.HOME || '', '.pi', 'agent', 'goal-driven', 'vehicle-arrival');
    this.monitorsFile = path.join(this.storagePath, 'monitors.json');
    this.trackingRecordsDir = path.join(this.storagePath, 'tracking-records');
    this.alertsFile = path.join(this.storagePath, 'alerts.jsonl');

    this.monitors = new Map();
    this.trackingRecords = new Map();
    this.alerts = new Map();
  }

  /**
   * 初始化存储
   */
  async initialize(): Promise<void> {
    try {
      // 创建目录
      await fs.mkdir(this.storagePath, { recursive: true });
      await fs.mkdir(this.trackingRecordsDir, { recursive: true });

      // 加载监控记录
      await this.loadMonitors();

      // 加载预警记录
      await this.loadAlerts();
    } catch (error) {
      // Re-throw initialization errors
      throw error;
    }
  }

  /**
   * 创建监控记录
   */
  async createMonitor(request: CreateMonitorRequest): Promise<VehicleArrivalMonitor> {
    const now = new Date();
    const monitor: VehicleArrivalMonitor = {
      id: uuidv4(),
      goalId: request.goalId,
      vehicleInfo: request.vehicleInfo,
      salesConsultant: request.salesConsultant,
      orderDate: request.orderDate,
      expectedArrivalDate: request.expectedArrivalDate,
      estimatedDeliveryDays: request.estimatedDeliveryDays,
      status: 'active',
      currentVehicleStatus: 'ordered',
      trackingRecords: [],
      alerts: [],
      createdAt: now,
      updatedAt: now,
    };

    this.monitors.set(monitor.id, monitor);
    await this.saveMonitors();

    return monitor;
  }

  /**
   * 获取监控记录
   */
  async getMonitor(monitorId: string): Promise<VehicleArrivalMonitor | null> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) {
      return null;
    }

    // 加载跟踪记录
    const trackingRecords = await this.loadTrackingRecords(monitorId);
    monitor.trackingRecords = trackingRecords;

    // 加载预警记录
    const alerts = await this.loadAlertsForMonitor(monitorId);
    monitor.alerts = alerts;

    return monitor;
  }

  /**
   * 根据目标ID获取监控记录
   */
  async getMonitorByGoalId(goalId: string): Promise<VehicleArrivalMonitor | null> {
    for (const [id, monitor] of this.monitors.entries()) {
      if (monitor.goalId === goalId) {
        return this.getMonitor(id);
      }
    }
    return null;
  }

  /**
   * 获取所有监控记录
   */
  async getAllMonitors(): Promise<VehicleArrivalMonitor[]> {
    const monitors: VehicleArrivalMonitor[] = [];
    for (const [id] of this.monitors.entries()) {
      const monitor = await this.getMonitor(id);
      if (monitor) {
        monitors.push(monitor);
      }
    }
    return monitors;
  }

  /**
   * 获取活跃的监控记录
   */
  async getActiveMonitors(): Promise<VehicleArrivalMonitor[]> {
    const allMonitors = await this.getAllMonitors();
    return allMonitors.filter(m => m.status === 'active');
  }

  /**
   * 更新监控状态
   */
  async updateMonitorStatus(
    monitorId: string,
    status: MonitorStatus,
    actualArrivalDate?: Date,
  ): Promise<void> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) {
      throw new Error(`监控记录不存在: ${monitorId}`);
    }

    monitor.status = status;
    monitor.updatedAt = new Date();

    if (actualArrivalDate) {
      monitor.actualArrivalDate = actualArrivalDate;
    }

    this.monitors.set(monitorId, monitor);
    await this.saveMonitors();
  }

  /**
   * 更新车辆状态
   */
  async updateVehicleStatus(monitorId: string, newStatus: string): Promise<void> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor) {
      throw new Error(`监控记录不存在: ${monitorId}`);
    }

    // 更新为有效的车辆状态
    const validStatuses = [
      'ordered',
      'in_production',
      'production_complete',
      'shipped',
      'arrived_dealership',
      'ready_for_pickup',
      'picked_up',
    ] as const;

    if (validStatuses.includes(newStatus as any)) {
      monitor.currentVehicleStatus = newStatus as any;
      monitor.updatedAt = new Date();
      this.monitors.set(monitorId, monitor);
      await this.saveMonitors();
    }
  }

  /**
   * 添加跟踪记录
   */
  async addTrackingRecord(record: TrackingRecord): Promise<void> {
    const monitor = this.monitors.get(record.monitorId);
    if (!monitor) {
      throw new Error(`监控记录不存在: ${record.monitorId}`);
    }

    // 保存到文件
    const trackingFile = path.join(this.trackingRecordsDir, `${record.monitorId}.jsonl`);
    await fs.appendFile(trackingFile, JSON.stringify(record) + '\n');

    // 更新内存中的记录
    const records = this.trackingRecords.get(record.monitorId) || [];
    records.push(record);
    this.trackingRecords.set(record.monitorId, records);

    monitor.updatedAt = new Date();
    this.monitors.set(record.monitorId, monitor);
    await this.saveMonitors();
  }

  /**
   * 添加预警
   */
  async addAlert(alert: Alert): Promise<void> {
    const monitor = this.monitors.get(alert.monitorId);
    if (!monitor) {
      throw new Error(`监控记录不存在: ${alert.monitorId}`);
    }

    // 保存到文件
    await fs.appendFile(this.alertsFile, JSON.stringify(alert) + '\n');

    // 更新内存中的记录
    const alerts = this.alerts.get(alert.monitorId) || [];
    alerts.push(alert);
    this.alerts.set(alert.monitorId, alerts);

    monitor.updatedAt = new Date();
    this.monitors.set(alert.monitorId, monitor);
    await this.saveMonitors();
  }

  /**
   * 标记预警为已解决
   */
  async resolveAlert(alertId: string): Promise<void> {
    for (const [monitorId, alerts] of this.alerts.entries()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.isResolved = true;
        alert.resolvedAt = new Date();
        this.alerts.set(monitorId, alerts);

        // 重新保存预警文件
        await this.saveAlerts();
        return;
      }
    }
    throw new Error(`预警记录不存在: ${alertId}`);
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<MonitorStatistics> {
    const monitors = await this.getAllMonitors();
    const trackingRecords = await this.getAllTrackingRecords();
    const alerts = await this.getAllAlerts();

    const totalMonitors = monitors.length;
    const activeMonitors = monitors.filter(m => m.status === 'active').length;
    const arrivedMonitors = monitors.filter(m => m.status === 'arrived').length;
    const delayedMonitors = monitors.filter(m => m.status === 'delayed').length;

    const totalTrackingRecords = trackingRecords.length;
    const averageTrackingCount = totalMonitors > 0
      ? totalTrackingRecords / totalMonitors
      : 0;

    // 计算平均交付周期
    const completedMonitors = monitors.filter(
      m => m.status === 'arrived' && m.actualArrivalDate && m.orderDate,
    );
    const averageDeliveryDays = completedMonitors.length > 0
      ? completedMonitors.reduce((sum, m) => {
          const days = Math.floor(
            (m.actualArrivalDate!.getTime() - m.orderDate.getTime()) / (1000 * 60 * 60 * 24),
          );
          return sum + days;
        }, 0) / completedMonitors.length
      : undefined;

    // 预警统计
    const unresolvedAlerts = alerts.filter(a => !a.isResolved);
    const alertSummary = {
      total: alerts.length,
      unresolved: unresolvedAlerts.length,
      byLevel: {
        info: alerts.filter(a => a.level === 'info').length,
        warning: alerts.filter(a => a.level === 'warning').length,
        critical: alerts.filter(a => a.level === 'critical').length,
      },
    };

    return {
      totalMonitors,
      activeMonitors,
      arrivedMonitors,
      delayedMonitors,
      totalTrackingRecords,
      averageTrackingCount,
      averageDeliveryDays,
      alertSummary,
    };
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    this.monitors.clear();
    this.trackingRecords.clear();
    this.alerts.clear();

    // 删除文件
    try {
      await fs.unlink(this.monitorsFile);
    } catch {}

    try {
      const files = await fs.readdir(this.trackingRecordsDir);
      for (const file of files) {
        await fs.unlink(path.join(this.trackingRecordsDir, file));
      }
    } catch {}

    try {
      await fs.unlink(this.alertsFile);
    } catch {}
  }

  /**
   * 加载监控记录
   */
  private async loadMonitors(): Promise<void> {
    try {
      const data = await fs.readFile(this.monitorsFile, 'utf-8');
      const monitors: VehicleArrivalMonitor[] = JSON.parse(data);

      for (const monitor of monitors) {
        // 转换日期字符串为Date对象
        monitor.orderDate = new Date(monitor.orderDate);
        monitor.expectedArrivalDate = new Date(monitor.expectedArrivalDate);
        if (monitor.actualArrivalDate) {
          monitor.actualArrivalDate = new Date(monitor.actualArrivalDate);
        }
        monitor.createdAt = new Date(monitor.createdAt);
        monitor.updatedAt = new Date(monitor.updatedAt);

        this.monitors.set(monitor.id, monitor);
      }
    } catch (error) {
      // 文件不存在是正常的，忽略错误
    }
  }

  /**
   * 保存监控记录
   */
  private async saveMonitors(): Promise<void> {
    const monitors = Array.from(this.monitors.values());
    await fs.writeFile(this.monitorsFile, JSON.stringify(monitors, null, 2));
  }

  /**
   * 加载跟踪记录
   */
  private async loadTrackingRecords(monitorId: string): Promise<TrackingRecord[]> {
    const trackingFile = path.join(this.trackingRecordsDir, `${monitorId}.jsonl`);

    try {
      const data = await fs.readFile(trackingFile, 'utf-8');
      const lines = data.trim().split('\n');

      const records: TrackingRecord[] = [];
      for (const line of lines) {
        if (line.trim()) {
          const record = JSON.parse(line);
          record.contactDate = new Date(record.contactDate);
          if (record.vehicleStatus?.estimatedArrivalDate) {
            record.vehicleStatus.estimatedArrivalDate = new Date(record.vehicleStatus.estimatedArrivalDate);
          }
          if (record.delayInfo?.newExpectedDate) {
            record.delayInfo.newExpectedDate = new Date(record.delayInfo.newExpectedDate);
          }
          record.createdAt = new Date(record.createdAt);
          records.push(record);
        }
      }

      return records;
    } catch (error) {
      return [];
    }
  }

  /**
   * 加载预警记录
   */
  private async loadAlerts(): Promise<void> {
    try {
      const data = await fs.readFile(this.alertsFile, 'utf-8');
      const lines = data.trim().split('\n');

      for (const line of lines) {
        if (line.trim()) {
          const alert = JSON.parse(line);
          alert.createdAt = new Date(alert.createdAt);
          if (alert.resolvedAt) {
            alert.resolvedAt = new Date(alert.resolvedAt);
          }

          const alerts = this.alerts.get(alert.monitorId) || [];
          alerts.push(alert);
          this.alerts.set(alert.monitorId, alerts);
        }
      }
    } catch (error) {
      // 文件不存在是正常的，忽略错误
    }
  }

  /**
   * 保存预警记录
   */
  private async saveAlerts(): Promise<void> {
    const allAlerts: Alert[] = [];
    for (const alerts of this.alerts.values()) {
      allAlerts.push(...alerts);
    }
    const data = allAlerts.map(a => JSON.stringify(a)).join('\n');
    await fs.writeFile(this.alertsFile, data);
  }

  /**
   * 加载指定监控的预警记录
   */
  private async loadAlertsForMonitor(monitorId: string): Promise<Alert[]> {
    return this.alerts.get(monitorId) || [];
  }

  /**
   * 获取所有跟踪记录
   */
  private async getAllTrackingRecords(): Promise<TrackingRecord[]> {
    const allRecords: TrackingRecord[] = [];
    for (const [monitorId] of this.monitors.keys()) {
      const records = await this.loadTrackingRecords(monitorId);
      allRecords.push(...records);
    }
    return allRecords;
  }

  /**
   * 获取所有预警记录
   */
  private async getAllAlerts(): Promise<Alert[]> {
    const allAlerts: Alert[] = [];
    for (const alerts of this.alerts.values()) {
      allAlerts.push(...alerts);
    }
    return allAlerts;
  }
}
