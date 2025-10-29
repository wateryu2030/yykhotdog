import { execSync } from 'child_process';
import { aiCodeService } from '../services/AICodeGenerationService';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 智能错误分析和自动修复服务
 */
export class IntelligentErrorAnalysisService {
  private projectRoot: string;
  private errorLogPath: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.errorLogPath = path.join(this.projectRoot, 'logs', 'errors.log');
  }

  /**
   * 监控并分析错误
   */
  async monitorAndAnalyzeErrors(): Promise<void> {
    try {
      // 运行测试并捕获错误
      const testResult = this.runTests();

      if (!testResult.success) {
        console.log('🔍 检测到测试错误，开始AI分析...');
        await this.analyzeTestErrors(testResult.error);
      }

      // 运行linting检查
      const lintResult = this.runLinting();

      if (!lintResult.success) {
        console.log('🔍 检测到代码质量问题，开始AI分析...');
        await this.analyzeLintingErrors(lintResult.error);
      }

      // 运行TypeScript编译检查
      const buildResult = this.runBuild();

      if (!buildResult.success) {
        console.log('🔍 检测到编译错误，开始AI分析...');
        await this.analyzeBuildErrors(buildResult.error);
      }
    } catch (error) {
      console.error('错误监控失败:', error);
    }
  }

  /**
   * 运行测试
   */
  private runTests(): { success: boolean; error?: string } {
    try {
      execSync('npm test -- --passWithNoTests --watchAll=false', {
        stdio: 'pipe',
        cwd: this.projectRoot,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.stdout?.toString() || error.message,
      };
    }
  }

  /**
   * 运行代码检查
   */
  private runLinting(): { success: boolean; error?: string } {
    try {
      execSync('npm run lint', {
        stdio: 'pipe',
        cwd: this.projectRoot,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.stdout?.toString() || error.message,
      };
    }
  }

  /**
   * 运行构建
   */
  private runBuild(): { success: boolean; error?: string } {
    try {
      execSync('npm run build', {
        stdio: 'pipe',
        cwd: this.projectRoot,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.stdout?.toString() || error.message,
      };
    }
  }

  /**
   * 分析测试错误
   */
  private async analyzeTestErrors(errorLog: string): Promise<void> {
    try {
      const analysis = await aiCodeService.analyzeAndFixError(errorLog);

      if (analysis) {
        console.log('🤖 AI分析结果:');
        console.log(analysis);

        // 保存分析结果
        this.saveAnalysisResult('test_errors', analysis);

        // 尝试自动修复
        await this.attemptAutoFix(analysis, 'test');
      }
    } catch (error) {
      console.error('测试错误分析失败:', error);
    }
  }

  /**
   * 分析代码质量问题
   */
  private async analyzeLintingErrors(errorLog: string): Promise<void> {
    try {
      const analysis = await aiCodeService.analyzeAndFixError(errorLog);

      if (analysis) {
        console.log('🤖 AI代码质量分析结果:');
        console.log(analysis);

        // 保存分析结果
        this.saveAnalysisResult('linting_errors', analysis);

        // 尝试自动修复
        await this.attemptAutoFix(analysis, 'linting');
      }
    } catch (error) {
      console.error('代码质量分析失败:', error);
    }
  }

  /**
   * 分析构建错误
   */
  private async analyzeBuildErrors(errorLog: string): Promise<void> {
    try {
      const analysis = await aiCodeService.analyzeAndFixError(errorLog);

      if (analysis) {
        console.log('🤖 AI构建错误分析结果:');
        console.log(analysis);

        // 保存分析结果
        this.saveAnalysisResult('build_errors', analysis);

        // 尝试自动修复
        await this.attemptAutoFix(analysis, 'build');
      }
    } catch (error) {
      console.error('构建错误分析失败:', error);
    }
  }

  /**
   * 尝试自动修复
   */
  private async attemptAutoFix(analysis: string, errorType: string): Promise<void> {
    try {
      // 提取修复代码
      const fixCode = this.extractFixCode(analysis);

      if (fixCode) {
        console.log('🔧 尝试应用自动修复...');

        // 保存修复代码到临时文件
        const tempFile = path.join(this.projectRoot, `temp_fix_${errorType}_${Date.now()}.ts`);
        fs.writeFileSync(tempFile, fixCode);

        console.log(`修复代码已保存到: ${tempFile}`);
        console.log('请手动检查并应用修复代码');

        // 记录修复尝试
        this.logFixAttempt(errorType, tempFile);
      }
    } catch (error) {
      console.error('自动修复尝试失败:', error);
    }
  }

  /**
   * 提取修复代码
   */
  private extractFixCode(analysis: string): string | null {
    // 简单的代码提取逻辑，可以根据需要改进
    const codeMatch = analysis.match(/```typescript\n([\s\S]*?)\n```/);
    if (codeMatch) {
      return codeMatch[1];
    }

    const codeMatch2 = analysis.match(/```\n([\s\S]*?)\n```/);
    if (codeMatch2) {
      return codeMatch2[1];
    }

    return null;
  }

  /**
   * 保存分析结果
   */
  private saveAnalysisResult(type: string, analysis: string): void {
    try {
      const logsDir = path.join(this.projectRoot, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${type}_analysis_${timestamp}.txt`;
      const filePath = path.join(logsDir, fileName);

      fs.writeFileSync(filePath, analysis);
      console.log(`分析结果已保存到: ${filePath}`);
    } catch (error) {
      console.error('保存分析结果失败:', error);
    }
  }

  /**
   * 记录修复尝试
   */
  private logFixAttempt(errorType: string, tempFile: string): void {
    try {
      const logsDir = path.join(this.projectRoot, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const logFile = path.join(logsDir, 'fix_attempts.log');
      const logEntry = `${new Date().toISOString()} - ${errorType} - ${tempFile}\n`;

      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('记录修复尝试失败:', error);
    }
  }

  /**
   * 生成错误报告
   */
  async generateErrorReport(): Promise<string> {
    try {
      const report = await aiCodeService.analyzeRepositoryHistory();

      // 保存报告
      const logsDir = path.join(this.projectRoot, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(logsDir, `error_report_${timestamp}.md`);

      fs.writeFileSync(reportFile, report);
      console.log(`错误报告已生成: ${reportFile}`);

      return report;
    } catch (error) {
      console.error('生成错误报告失败:', error);
      return '';
    }
  }
}

// 导出单例实例
export const errorAnalysisService = new IntelligentErrorAnalysisService();
