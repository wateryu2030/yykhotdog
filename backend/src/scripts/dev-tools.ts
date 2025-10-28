#!/usr/bin/env node

/**
 * 智能开发工具
 * 提供AI代码生成、错误分析、任务调度等功能
 */

import { Command } from 'commander';
import { aiCodeService } from '../services/AICodeGenerationService';
import { errorAnalysisService } from '../services/IntelligentErrorAnalysisService';
import { taskSchedulerService } from '../services/IntelligentTaskSchedulerService';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program.name('dev-tools').description('热狗连锁店智能开发工具').version('1.0.0');

// AI代码生成命令
program
  .command('generate')
  .description('使用AI生成代码')
  .option('-t, --type <type>', '代码类型 (api|component|service)', 'api')
  .option('-n, --name <name>', '代码名称')
  .option('-d, --description <description>', '功能描述')
  .action(async options => {
    try {
      console.log('🤖 开始AI代码生成...');

      let generatedCode = '';

      switch (options.type) {
        case 'api':
          generatedCode = await aiCodeService.generateAPICode(
            options.name || '/api/example',
            options.description || '示例API接口'
          );
          break;
        case 'component':
          generatedCode = await aiCodeService.generateReactComponent(
            options.name || 'ExampleComponent',
            options.description || '示例React组件'
          );
          break;
        case 'service':
          generatedCode = await aiCodeService.generateCodeFromRequest(
            `创建服务: ${options.name || 'ExampleService'} - ${options.description || '示例服务'}`
          );
          break;
        default:
          generatedCode = await aiCodeService.generateCodeFromRequest(
            options.description || '生成示例代码'
          );
      }

      if (generatedCode) {
        // 保存生成的代码
        const timestamp = Date.now();
        const fileName = `${options.type}_${options.name || 'generated'}_${timestamp}.ts`;
        const filePath = path.join(process.cwd(), 'generated', fileName);

        // 确保目录存在
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, generatedCode);
        console.log(`✅ 代码已生成并保存到: ${filePath}`);
      } else {
        console.log('❌ 代码生成失败');
      }
    } catch (error) {
      console.error('❌ 代码生成失败:', error);
    }
  });

// 错误分析命令
program
  .command('analyze')
  .description('分析项目错误并提供修复建议')
  .option('-f, --file <file>', '指定要分析的文件')
  .option('-t, --type <type>', '分析类型 (test|lint|build)', 'all')
  .action(async options => {
    try {
      console.log('🔍 开始错误分析...');

      if (options.file) {
        // 分析特定文件
        const fileContent = fs.readFileSync(options.file, 'utf-8');
        const analysis = await aiCodeService.analyzeAndFixError(
          `文件内容:\n${fileContent}`,
          options.file
        );

        if (analysis) {
          console.log('🤖 AI分析结果:');
          console.log(analysis);
        }
      } else {
        // 分析整个项目
        await errorAnalysisService.monitorAndAnalyzeErrors();
      }

      console.log('✅ 错误分析完成');
    } catch (error) {
      console.error('❌ 错误分析失败:', error);
    }
  });

// 任务调度命令
program
  .command('schedule')
  .description('管理智能任务调度')
  .option('-a, --action <action>', '操作 (start|stop|status|execute)', 'status')
  .option('-t, --task <task>', '任务名称')
  .action(async options => {
    try {
      switch (options.action) {
        case 'start':
          taskSchedulerService.startAllTasks();
          console.log('✅ 所有任务已启动');
          break;
        case 'stop':
          taskSchedulerService.stopAllTasks();
          console.log('⏹️ 所有任务已停止');
          break;
        case 'status':
          const status = taskSchedulerService.getTaskStatus();
          console.log('📊 任务状态:');
          Object.entries(status).forEach(([name, isRunning]) => {
            console.log(`  ${name}: ${isRunning ? '🟢 运行中' : '🔴 已停止'}`);
          });
          break;
        case 'execute':
          if (options.task) {
            await taskSchedulerService.executeTaskManually(options.task);
          } else {
            console.log('❌ 请指定任务名称');
          }
          break;
        default:
          console.log('❌ 未知操作');
      }
    } catch (error) {
      console.error('❌ 任务调度操作失败:', error);
    }
  });

// 项目报告命令
program
  .command('report')
  .description('生成项目分析报告')
  .option('-t, --type <type>', '报告类型 (daily|weekly|error)', 'daily')
  .action(async options => {
    try {
      console.log('📊 开始生成项目报告...');

      let report = '';

      switch (options.type) {
        case 'daily':
          report = await errorAnalysisService.generateErrorReport();
          break;
        case 'weekly':
          report = await aiCodeService.analyzeRepositoryHistory();
          break;
        case 'error':
          await errorAnalysisService.monitorAndAnalyzeErrors();
          report = await errorAnalysisService.generateErrorReport();
          break;
        default:
          report = await errorAnalysisService.generateErrorReport();
      }

      if (report) {
        const timestamp = new Date().toISOString().split('T')[0];
        const reportFile = path.join(
          process.cwd(),
          'reports',
          `${options.type}_report_${timestamp}.md`
        );

        // 确保目录存在
        const dir = path.dirname(reportFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(reportFile, report);
        console.log(`✅ 报告已生成: ${reportFile}`);
      } else {
        console.log('❌ 报告生成失败');
      }
    } catch (error) {
      console.error('❌ 报告生成失败:', error);
    }
  });

// 代码质量检查命令
program
  .command('quality')
  .description('执行代码质量检查')
  .option('-f, --fix', '自动修复问题')
  .action(async options => {
    try {
      console.log('🔍 开始代码质量检查...');

      const { execSync } = require('child_process');

      // 运行ESLint
      console.log('📝 运行ESLint检查...');
      try {
        if (options.fix) {
          execSync('npm run lint:fix', { stdio: 'inherit' });
        } else {
          execSync('npm run lint', { stdio: 'inherit' });
        }
        console.log('✅ ESLint检查完成');
      } catch (error) {
        console.log('⚠️ ESLint检查发现问题');
      }

      // 运行Prettier
      console.log('🎨 运行Prettier格式化...');
      try {
        execSync('npx prettier --write .', { stdio: 'inherit' });
        console.log('✅ Prettier格式化完成');
      } catch (error) {
        console.log('⚠️ Prettier格式化失败');
      }

      // 运行TypeScript检查
      console.log('🔧 运行TypeScript检查...');
      try {
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        console.log('✅ TypeScript检查完成');
      } catch (error) {
        console.log('⚠️ TypeScript检查发现问题');
      }

      console.log('✅ 代码质量检查完成');
    } catch (error) {
      console.error('❌ 代码质量检查失败:', error);
    }
  });

// 解析命令行参数
program.parse();
