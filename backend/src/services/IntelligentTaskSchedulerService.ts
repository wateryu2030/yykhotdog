import * as cron from 'node-cron';
import { execSync } from 'child_process';
import { errorAnalysisService } from './IntelligentErrorAnalysisService';
import { aiCodeService } from './AICodeGenerationService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 智能任务调度服务
 * 提供自动化任务调度、监控和报告功能
 */
export class IntelligentTaskSchedulerService {
  private projectRoot: string;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
  private taskStatus: Map<string, boolean> = new Map();

  constructor() {
    this.projectRoot = process.cwd();
    this.initializeScheduledTasks();
  }

  /**
   * 初始化定时任务
   */
  private initializeScheduledTasks(): void {
    // 每天凌晨2点执行构建和测试
    this.scheduleTask('daily-build-test', '0 2 * * *', () => {
      this.executeDailyBuildAndTest();
    });

    // 每小时执行错误监控
    this.scheduleTask('hourly-error-monitor', '0 * * * *', () => {
      this.executeHourlyErrorMonitoring();
    });

    // 每周一生成项目报告
    this.scheduleTask('weekly-report', '0 9 * * 1', () => {
      this.generateWeeklyReport();
    });

    // 每次提交后执行代码质量检查
    this.scheduleTask('post-commit-check', '0 */5 * * *', () => {
      this.executePostCommitCheck();
    });

    console.log('✅ 智能任务调度器已初始化');
  }

  /**
   * 调度任务
   */
  private scheduleTask(name: string, cronExpression: string, task: () => void): void {
    const scheduledTask = cron.schedule(cronExpression, task, {
      scheduled: false,
      timezone: 'Asia/Shanghai',
    });

    this.scheduledTasks.set(name, scheduledTask);
    console.log(`📅 任务已调度: ${name} (${cronExpression})`);
  }

  /**
   * 启动所有任务
   */
  public startAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.start();
      this.taskStatus.set(name, true);
      console.log(`🚀 任务已启动: ${name}`);
    });
  }

  /**
   * 停止所有任务
   */
  public stopAllTasks(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      this.taskStatus.set(name, false);
      console.log(`⏹️ 任务已停止: ${name}`);
    });
  }

  /**
   * 执行每日构建和测试
   */
  private async executeDailyBuildAndTest(): Promise<void> {
    console.log('🔨 开始执行每日构建和测试...');

    try {
      // 执行构建
      console.log('📦 执行项目构建...');
      execSync('npm run build', { stdio: 'inherit', cwd: this.projectRoot });

      // 执行测试
      console.log('🧪 执行测试套件...');
      execSync('npm test -- --passWithNoTests --watchAll=false', {
        stdio: 'inherit',
        cwd: this.projectRoot,
      });

      // 执行代码质量检查
      console.log('🔍 执行代码质量检查...');
      execSync('npm run lint', { stdio: 'inherit', cwd: this.projectRoot });

      console.log('✅ 每日构建和测试完成');

      // 生成报告
      await this.generateDailyReport();
    } catch (error) {
      console.error('❌ 每日构建和测试失败:', error);

      // 发送错误通知
      await this.sendErrorNotification('daily-build-test', error);
    }
  }

  /**
   * 执行每小时错误监控
   */
  private async executeHourlyErrorMonitoring(): Promise<void> {
    console.log('🔍 开始执行每小时错误监控...');

    try {
      await errorAnalysisService.monitorAndAnalyzeErrors();
      console.log('✅ 每小时错误监控完成');
    } catch (error) {
      console.error('❌ 每小时错误监控失败:', error);
    }
  }

  /**
   * 生成每周报告
   */
  private async generateWeeklyReport(): Promise<void> {
    console.log('📊 开始生成每周报告...');

    try {
      const report = await aiCodeService.analyzeRepositoryHistory();

      // 保存报告
      const reportsDir = path.join(this.projectRoot, 'reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const reportFile = path.join(reportsDir, `weekly_report_${timestamp}.md`);

      fs.writeFileSync(reportFile, report);
      console.log(`📊 每周报告已生成: ${reportFile}`);
    } catch (error) {
      console.error('❌ 生成每周报告失败:', error);
    }
  }

  /**
   * 执行提交后检查
   */
  private async executePostCommitCheck(): Promise<void> {
    console.log('🔍 开始执行提交后检查...');

    try {
      // 检查是否有新的提交
      const lastCommit = this.getLastCommitHash();
      const currentCommit = this.getCurrentCommitHash();

      if (lastCommit !== currentCommit) {
        console.log('🆕 检测到新提交，开始代码质量检查...');

        // 执行代码质量检查
        execSync('npm run lint:fix', { stdio: 'inherit', cwd: this.projectRoot });

        // 执行格式化
        execSync('npx prettier --write .', { stdio: 'inherit', cwd: this.projectRoot });

        // 更新最后提交记录
        this.updateLastCommitHash(currentCommit);

        console.log('✅ 提交后检查完成');
      }
    } catch (error) {
      console.error('❌ 提交后检查失败:', error);
    }
  }

  /**
   * 生成每日报告
   */
  private async generateDailyReport(): Promise<void> {
    try {
      const report = await errorAnalysisService.generateErrorReport();

      if (report) {
        const reportsDir = path.join(this.projectRoot, 'reports');
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const reportFile = path.join(reportsDir, `daily_report_${timestamp}.md`);

        fs.writeFileSync(reportFile, report);
        console.log(`📊 每日报告已生成: ${reportFile}`);
      }
    } catch (error) {
      console.error('生成每日报告失败:', error);
    }
  }

  /**
   * 发送错误通知
   */
  private async sendErrorNotification(taskName: string, error: any): Promise<void> {
    try {
      const notification = `任务失败通知:
任务名称: ${taskName}
失败时间: ${new Date().toISOString()}
错误信息: ${error.message || error}

请检查日志文件获取详细信息。`;

      // 保存通知到文件
      const logsDir = path.join(this.projectRoot, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const notificationFile = path.join(logsDir, `notification_${Date.now()}.txt`);
      fs.writeFileSync(notificationFile, notification);

      console.log(`📢 错误通知已保存: ${notificationFile}`);
    } catch (error) {
      console.error('发送错误通知失败:', error);
    }
  }

  /**
   * 获取最后提交哈希
   */
  private getLastCommitHash(): string {
    try {
      const hashFile = path.join(this.projectRoot, '.last_commit_hash');
      if (fs.existsSync(hashFile)) {
        return fs.readFileSync(hashFile, 'utf-8').trim();
      }
      return '';
    } catch (error) {
      return '';
    }
  }

  /**
   * 获取当前提交哈希
   */
  private getCurrentCommitHash(): string {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      return '';
    }
  }

  /**
   * 更新最后提交哈希
   */
  private updateLastCommitHash(hash: string): void {
    try {
      const hashFile = path.join(this.projectRoot, '.last_commit_hash');
      fs.writeFileSync(hashFile, hash);
    } catch (error) {
      console.error('更新最后提交哈希失败:', error);
    }
  }

  /**
   * 手动执行任务
   */
  public async executeTaskManually(taskName: string): Promise<void> {
    console.log(`🔧 手动执行任务: ${taskName}`);

    switch (taskName) {
      case 'daily-build-test':
        await this.executeDailyBuildAndTest();
        break;
      case 'hourly-error-monitor':
        await this.executeHourlyErrorMonitoring();
        break;
      case 'weekly-report':
        await this.generateWeeklyReport();
        break;
      case 'post-commit-check':
        await this.executePostCommitCheck();
        break;
      default:
        console.log(`❌ 未知任务: ${taskName}`);
    }
  }

  /**
   * 获取任务状态
   */
  public getTaskStatus(): { [key: string]: boolean } {
    const status: { [key: string]: boolean } = {};

    this.taskStatus.forEach((isRunning, name) => {
      status[name] = isRunning;
    });

    return status;
  }
}

// 导出单例实例
export const taskSchedulerService = new IntelligentTaskSchedulerService();
