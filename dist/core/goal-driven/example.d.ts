/**
 * Goal-Driven Agent 使用示例
 *
 * 这个示例展示了如何使用各个组件
 */
import { GoalStore, TaskStore, KnowledgeStore, NotificationQueue } from './index';
export declare function runExample(): Promise<{
    goalStore: GoalStore;
    taskStore: TaskStore;
    knowledgeStore: KnowledgeStore;
    notificationQueue: NotificationQueue;
    goal: import("./types").Goal;
    tasks: {
        task1: import("./types").Task;
        task2: import("./types").Task;
        task3: import("./types").Task;
    };
}>;
//# sourceMappingURL=example.d.ts.map