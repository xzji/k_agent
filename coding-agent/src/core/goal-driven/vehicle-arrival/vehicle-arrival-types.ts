/**
 * 车辆到店监控类型定义
 */

/**
 * 车辆到店监控记录
 */
export interface VehicleArrivalMonitor {
  // 基本信息
  id: string;
  goalId: string; // 关联的购车目标ID
  vehicleInfo: VehicleInfo;

  // 销售顾问信息
  salesConsultant: SalesConsultantInfo;

  // 时间节点
  orderDate: Date;
  expectedArrivalDate: Date;
  actualArrivalDate?: Date;
  estimatedDeliveryDays?: number; // 预计交付周期（天）

  // 监控状态
  status: MonitorStatus;
  currentVehicleStatus: VehicleStatus;

  // 跟踪记录
  trackingRecords: TrackingRecord[];

  // 预警信息
  alerts: Alert[];

  // 元数据
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 车辆信息
 */
export interface VehicleInfo {
  brand: string; // 品牌
  model: string; // 型号
  vin?: string; // 车架号
  color?: string; // 颜色
  configuration?: string; // 配置版本
  year?: string; // 年款
}

/**
 * 销售顾问信息
 */
export interface SalesConsultantInfo {
  name: string; // 顾问姓名
  phone: string; // 联系电话
  wechat?: string; // 微信号
  dealership: string; // 经销商名称
  dealershipAddress?: string; // 经销商地址
}

/**
 * 监控状态
 */
export type MonitorStatus = 'active' | 'arrived' | 'cancelled' | 'delayed';

/**
 * 车辆状态
 */
export type VehicleStatus =
  | 'ordered' // 已下单
  | 'in_production' // 生产中
  | 'production_complete' // 生产完成/已下线
  | 'shipped' // 已发车/运输中
  | 'arrived_dealership' // 已到店
  | 'ready_for_pickup' // 可提车
  | 'picked_up'; // 已提车

/**
 * 跟踪记录
 */
export interface TrackingRecord {
  id: string;
  monitorId: string;
  contactDate: Date;
  contactMethod: ContactMethod;
  contactResult: ContactResult;

  // 物流状态更新
  vehicleStatus?: {
    productionStatus?: string;
    logisticsStatus?: string;
    estimatedArrivalDate?: Date;
    trackingNumber?: string;
    currentLocation?: string;
  };

  // 延期信息
  delayInfo?: DelayInfo;

  // 备注
  notes?: string;

  createdAt: Date;
}

/**
 * 联系方式
 */
export type ContactMethod = 'phone' | 'wechat' | 'visit' | 'message' | 'other';

/**
 * 联系结果
 */
export type ContactResult = 'success' | 'failed' | 'no_response';

/**
 * 延期信息
 */
export interface DelayInfo {
  isDelayed: boolean;
  delayDays?: number;
  delayReason?: string;
  newExpectedDate?: Date;
}

/**
 * 预警信息
 */
export interface Alert {
  id: string;
  monitorId: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
}

/**
 * 预警类型
 */
export type AlertType =
  | 'delay' // 延期预警
  | 'missing_info' // 信息缺失预警
  | 'abnormal_status' // 状态异常预警
  | 'reminder' // 提醒
  | 'arrival_reminder' // 到店提醒
  | 'advance_reminder'; // 提前提醒

/**
 * 预警级别
 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/**
 * 创建监控请求
 */
export interface CreateMonitorRequest {
  goalId: string;
  vehicleInfo: VehicleInfo;
  salesConsultant: SalesConsultantInfo;
  orderDate: Date;
  expectedArrivalDate: Date;
  estimatedDeliveryDays?: number;
}

/**
 * 更新跟踪记录请求
 */
export interface UpdateTrackingRequest {
  monitorId: string;
  contactMethod: ContactMethod;
  contactResult: ContactResult;
  vehicleStatus?: {
    productionStatus?: string;
    logisticsStatus?: string;
    estimatedArrivalDate?: Date;
    trackingNumber?: string;
    currentLocation?: string;
  };
  delayInfo?: DelayInfo;
  notes?: string;
}

/**
 * 监控统计信息
 */
export interface MonitorStatistics {
  totalMonitors: number;
  activeMonitors: number;
  arrivedMonitors: number;
  delayedMonitors: number;
  totalTrackingRecords: number;
  averageTrackingCount: number;
  averageDeliveryDays?: number;
  alertSummary: {
    total: number;
    unresolved: number;
    byLevel: Record<AlertLevel, number>;
  };
}

/**
 * 到店报告
 */
export interface ArrivalReport {
  monitor: VehicleArrivalMonitor;
  summary: {
    totalDays: number;
    onTime: boolean;
    trackingCount: number;
    alertCount: number;
  };
  timeline: {
    orderDate: Date;
    firstTrackingDate: Date;
    arrivalDate: Date;
    milestones: Array<{
      date: Date;
      event: string;
      description: string;
    }>;
  };
  recommendations: string[];
}

/**
 * 监控阶段
 */
export enum MonitoringPhase {
  Normal = 'normal', // 正常期 (每3-5天)
  PreArrival = 'pre_arrival', // 临期 (每2天)
  Overdue = 'overdue', // 逾期 (每天)
  Completed = 'completed', // 已完成
}

/**
 * 跟踪频率配置
 */
export interface TrackingFrequency {
  phase: MonitoringPhase;
  intervalDays: number;
  description: string;
}
