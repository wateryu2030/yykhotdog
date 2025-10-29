import { logger } from '../utils/logger';
import { sequelize } from '../config/database';
import { QueryTypes } from 'sequelize';

interface DataQualityRule {
  id: string;
  name: string;
  description: string;
  table: string;
  column?: string;
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

interface DataQualityIssue {
  id: string;
  ruleId: string;
  table: string;
  column?: string;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  examples: any[];
  detectedAt: string;
}

interface DataQualityReport {
  summary: {
    totalRules: number;
    passedRules: number;
    failedRules: number;
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  };
  issues: DataQualityIssue[];
  recommendations: string[];
  generatedAt: string;
}

class DataQualityService {
  private rules: DataQualityRule[] = [];
  private issues: DataQualityIssue[] = [];

  constructor() {
    this.initializeDefaultRules();
    logger.info('数据质量检查服务初始化完成');
  }

  /**
   * 初始化默认数据质量规则
   */
  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: 'orders_null_customer_id',
        name: '订单客户ID不能为空',
        description: '检查orders表中customer_id字段是否有空值',
        table: 'orders',
        column: 'customer_id',
        rule: 'customer_id IS NULL',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'orders_null_store_id',
        name: '订单门店ID不能为空',
        description: '检查orders表中store_id字段是否有空值',
        table: 'orders',
        column: 'store_id',
        rule: 'store_id IS NULL',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'orders_negative_amount',
        name: '订单金额不能为负数',
        description: '检查orders表中total_amount字段是否有负值',
        table: 'orders',
        column: 'total_amount',
        rule: 'total_amount < 0',
        severity: 'high',
        enabled: true
      },
      {
        id: 'order_items_null_product_id',
        name: '订单项产品ID不能为空',
        description: '检查order_items表中product_id字段是否有空值',
        table: 'order_items',
        column: 'product_id',
        rule: 'product_id IS NULL',
        severity: 'critical',
        enabled: true
      },
      {
        id: 'order_items_zero_quantity',
        name: '订单项数量不能为零',
        description: '检查order_items表中quantity字段是否有零值',
        table: 'order_items',
        column: 'quantity',
        rule: 'quantity = 0',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'stores_null_city',
        name: '门店城市不能为空',
        description: '检查stores表中city字段是否有空值',
        table: 'stores',
        column: 'city',
        rule: 'city IS NULL OR city = \'\'',
        severity: 'high',
        enabled: true
      },
      {
        id: 'products_null_name',
        name: '产品名称不能为空',
        description: '检查products表中product_name字段是否有空值',
        table: 'products',
        column: 'product_name',
        rule: 'product_name IS NULL OR product_name = \'\'',
        severity: 'high',
        enabled: true
      },
      {
        id: 'duplicate_orders',
        name: '重复订单检查',
        description: '检查是否存在重复的订单记录',
        table: 'orders',
        rule: 'duplicate_check',
        severity: 'medium',
        enabled: true
      },
      {
        id: 'orphaned_order_items',
        name: '孤立订单项检查',
        description: '检查order_items表中是否存在没有对应订单的记录',
        table: 'order_items',
        rule: 'orphaned_check',
        severity: 'high',
        enabled: true
      },
      {
        id: 'future_dates',
        name: '未来日期检查',
        description: '检查created_at字段是否有未来日期',
        table: 'orders',
        column: 'created_at',
        rule: 'created_at > GETDATE()',
        severity: 'medium',
        enabled: true
      }
    ];
  }

  /**
   * 执行数据质量检查
   */
  public async performQualityCheck(): Promise<DataQualityReport> {
    logger.info('开始执行数据质量检查');
    
    this.issues = [];
    const enabledRules = this.rules.filter(rule => rule.enabled);
    
    for (const rule of enabledRules) {
      try {
        await this.checkRule(rule);
      } catch (error) {
        logger.error(`检查规则 ${rule.name} 失败:`, error);
      }
    }

    const report = this.generateReport();
    logger.info(`数据质量检查完成，发现 ${report.summary.totalIssues} 个问题`);
    
    return report;
  }

  /**
   * 检查单个规则
   */
  private async checkRule(rule: DataQualityRule): Promise<void> {
    let query: string;
    let count: number;
    let examples: any[] = [];

    try {
      if (rule.rule === 'duplicate_check') {
        // 重复订单检查
        query = `
          SELECT 
            customer_id, 
            store_id, 
            created_at, 
            total_amount,
            COUNT(*) as duplicate_count
          FROM orders 
          GROUP BY customer_id, store_id, created_at, total_amount
          HAVING COUNT(*) > 1
        `;
        
        const duplicates = await sequelize.query(query, {
          type: QueryTypes.SELECT
        }) as any[];

        count = duplicates.length;
        examples = duplicates.slice(0, 5);

        if (count > 0) {
          this.addIssue({
            id: `${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            table: rule.table,
            issue: `发现 ${count} 组重复订单`,
            severity: rule.severity,
            count,
            examples,
            detectedAt: new Date().toISOString()
          });
        }

      } else if (rule.rule === 'orphaned_check') {
        // 孤立订单项检查
        query = `
          SELECT oi.id, oi.order_id, oi.product_id
          FROM order_items oi
          LEFT JOIN orders o ON oi.order_id = o.id
          WHERE o.id IS NULL
        `;
        
        const orphaned = await sequelize.query(query, {
          type: QueryTypes.SELECT
        }) as any[];

        count = orphaned.length;
        examples = orphaned.slice(0, 5);

        if (count > 0) {
          this.addIssue({
            id: `${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            table: rule.table,
            issue: `发现 ${count} 个孤立订单项`,
            severity: rule.severity,
            count,
            examples,
            detectedAt: new Date().toISOString()
          });
        }

      } else {
        // 标准规则检查
        query = `
          SELECT COUNT(*) as count
          FROM ${rule.table}
          WHERE ${rule.rule}
        `;
        
        const result = await sequelize.query(query, {
          type: QueryTypes.SELECT
        }) as any[];

        count = result[0]?.count || 0;

        if (count > 0) {
          // 获取示例数据
          const exampleQuery = `
            SELECT TOP 5 *
            FROM ${rule.table}
            WHERE ${rule.rule}
          `;
          
          examples = await sequelize.query(exampleQuery, {
            type: QueryTypes.SELECT
          }) as any[];

          this.addIssue({
            id: `${rule.id}_${Date.now()}`,
            ruleId: rule.id,
            table: rule.table,
            column: rule.column,
            issue: `${rule.description} - 发现 ${count} 条记录`,
            severity: rule.severity,
            count,
            examples,
            detectedAt: new Date().toISOString()
          });
        }
      }

    } catch (error) {
      logger.error(`执行规则 ${rule.name} 的查询失败:`, error);
    }
  }

  /**
   * 添加数据质量问题
   */
  private addIssue(issue: DataQualityIssue): void {
    this.issues.push(issue);
  }

  /**
   * 生成数据质量报告
   */
  private generateReport(): DataQualityReport {
    const totalRules = this.rules.length;
    const failedRules = this.issues.length;
    const passedRules = totalRules - failedRules;
    
    const criticalIssues = this.issues.filter(i => i.severity === 'critical').length;
    const highIssues = this.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.issues.filter(i => i.severity === 'medium').length;
    const lowIssues = this.issues.filter(i => i.severity === 'low').length;

    const recommendations = this.generateRecommendations();

    return {
      summary: {
        totalRules,
        passedRules,
        failedRules,
        totalIssues: this.issues.length,
        criticalIssues,
        highIssues,
        mediumIssues,
        lowIssues
      },
      issues: this.issues,
      recommendations,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 生成修复建议
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    const criticalIssues = this.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`发现 ${criticalIssues.length} 个严重数据质量问题，需要立即修复`);
    }

    const highIssues = this.issues.filter(i => i.severity === 'high');
    if (highIssues.length > 0) {
      recommendations.push(`发现 ${highIssues.length} 个高优先级数据质量问题，建议尽快修复`);
    }

    const duplicateIssues = this.issues.filter(i => i.ruleId.includes('duplicate'));
    if (duplicateIssues.length > 0) {
      recommendations.push('发现重复数据，建议实施数据去重策略');
    }

    const orphanedIssues = this.issues.filter(i => i.ruleId.includes('orphaned'));
    if (orphanedIssues.length > 0) {
      recommendations.push('发现孤立数据，建议清理无效的关联记录');
    }

    const nullIssues = this.issues.filter(i => i.issue.includes('空值'));
    if (nullIssues.length > 0) {
      recommendations.push('发现空值问题，建议加强数据验证和约束');
    }

    if (this.issues.length === 0) {
      recommendations.push('数据质量良好，继续保持');
    }

    return recommendations;
  }

  /**
   * 获取数据质量规则
   */
  public getRules(): DataQualityRule[] {
    return [...this.rules];
  }

  /**
   * 添加自定义规则
   */
  public addRule(rule: Omit<DataQualityRule, 'id'>): void {
    const newRule: DataQualityRule = {
      ...rule,
      id: `custom_${Date.now()}`
    };
    this.rules.push(newRule);
    logger.info(`添加自定义数据质量规则: ${rule.name}`);
  }

  /**
   * 更新规则
   */
  public updateRule(ruleId: string, updates: Partial<DataQualityRule>): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.rules[ruleIndex] = { ...this.rules[ruleIndex], ...updates };
    logger.info(`更新数据质量规则: ${ruleId}`);
    return true;
  }

  /**
   * 删除规则
   */
  public removeRule(ruleId: string): boolean {
    const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    const removedRule = this.rules.splice(ruleIndex, 1)[0];
    logger.info(`删除数据质量规则: ${removedRule.name}`);
    return true;
  }

  /**
   * 获取数据质量统计
   */
  public getQualityStats(): {
    totalRules: number;
    enabledRules: number;
    disabledRules: number;
    lastCheckTime: string | null;
    totalIssues: number;
    issuesBySeverity: Record<string, number>;
  } {
    const enabledRules = this.rules.filter(r => r.enabled).length;
    const disabledRules = this.rules.length - enabledRules;
    
    const issuesBySeverity = this.issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalRules: this.rules.length,
      enabledRules,
      disabledRules,
      lastCheckTime: this.issues.length > 0 ? 
        this.issues[this.issues.length - 1].detectedAt : null,
      totalIssues: this.issues.length,
      issuesBySeverity
    };
  }

  /**
   * 清理历史问题
   */
  public clearHistory(): void {
    this.issues = [];
    logger.info('数据质量检查历史已清理');
  }
}

export default DataQualityService;
