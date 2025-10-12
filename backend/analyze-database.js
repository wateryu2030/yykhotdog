const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const sequelize = new Sequelize('cyrg2025', 'hotdog', 'Zhkj@62102218', {
  host: process.env.DB_HOST || 'rm-uf660d00xovkm30678o.sqlserver.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT) || 1433,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true
    }
  },
  logging: false,
  timezone: '+08:00'
});

class DatabaseAnalyzer {
  constructor() {
    this.analysis = {
      databaseInfo: {},
      tables: [],
      relationships: [],
      dataVolume: {},
      recommendations: []
    };
  }

  async connect() {
    try {
      await sequelize.authenticate();
      console.log('✅ 数据库连接成功');
      return true;
    } catch (error) {
      console.error('❌ 数据库连接失败:', error.message);
      return false;
    }
  }

  async getAllTables() {
    try {
      const [tables] = await sequelize.query(`
        SELECT 
          t.name as table_name,
          s.name as schema_name,
          p.rows as row_count,
          CAST(ROUND((SUM(a.total_pages) * 8) / 1024.00, 2) AS NUMERIC(36, 2)) AS total_space_mb,
          t.create_date,
          t.modify_date
        FROM sys.tables t
        INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
        INNER JOIN sys.indexes i ON t.object_id = i.object_id
        INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
        INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
        WHERE i.index_id <= 1
        GROUP BY t.name, s.name, p.rows, t.create_date, t.modify_date
        ORDER BY t.name
      `);

      this.analysis.tables = tables;
      console.log(`📋 发现 ${tables.length} 个表`);
      return tables;
    } catch (error) {
      console.error('❌ 获取表列表失败:', error.message);
      return [];
    }
  }

  async getTableStructure(tableName) {
    try {
      const [columns] = await sequelize.query(`
        SELECT 
          c.name as column_name,
          t.name as data_type,
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable,
          c.is_identity,
          ISNULL(ep.value, '') as description,
          CASE 
            WHEN pk.column_id IS NOT NULL THEN 'PK'
            WHEN fk.parent_column_id IS NOT NULL THEN 'FK'
            ELSE ''
          END as key_type
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        LEFT JOIN sys.extended_properties ep ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
        LEFT JOIN (
          SELECT ic.column_id, ic.object_id
          FROM sys.index_columns ic
          INNER JOIN sys.indexes i ON ic.object_id = i.object_id AND ic.index_id = i.index_id
          WHERE i.is_primary_key = 1
        ) pk ON pk.column_id = c.column_id AND pk.object_id = c.object_id
        LEFT JOIN sys.foreign_key_columns fk ON fk.parent_object_id = c.object_id AND fk.parent_column_id = c.column_id
        WHERE c.object_id = OBJECT_ID('${tableName}')
        ORDER BY c.column_id
      `);

      return columns;
    } catch (error) {
      console.error(`❌ 获取表 ${tableName} 结构失败:`, error.message);
      return [];
    }
  }

  async getForeignKeys() {
    try {
      const [relationships] = await sequelize.query(`
        SELECT 
          fk.name as constraint_name,
          OBJECT_NAME(fk.parent_object_id) as table_name,
          COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as column_name,
          OBJECT_NAME(fk.referenced_object_id) as referenced_table_name,
          COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referenced_column_name
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        ORDER BY table_name, column_name
      `);

      this.analysis.relationships = relationships;
      return relationships;
    } catch (error) {
      console.error('❌ 获取外键关系失败:', error.message);
      return [];
    }
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTables: this.analysis.tables.length,
        totalRows: this.analysis.tables.reduce((sum, t) => sum + (t.row_count || 0), 0)
      },
      tables: [],
      relationships: this.analysis.relationships
    };

    for (const table of this.analysis.tables) {
      console.log(`🔍 分析表: ${table.table_name}`);
      
      const structure = await this.getTableStructure(table.table_name);
      report.tables.push({
        ...table,
        structure
      });
    }

    return report;
  }

  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `database-analysis-${timestamp}.json`;
    const filepath = path.join(__dirname, filename);

    try {
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`📄 报告已保存: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('❌ 保存报告失败:', error.message);
      return null;
    }
  }

  async generateMarkdownReport(report) {
    let markdown = `# 数据库架构分析报告

## 基本信息
- **分析时间**: ${new Date(report.timestamp).toLocaleString()}
- **总表数**: ${report.summary.totalTables}
- **总行数**: ${report.summary.totalRows.toLocaleString()}

## 表结构详情

`;

    for (const table of report.tables) {
      markdown += `### ${table.table_name}
- **行数**: ${table.row_count?.toLocaleString() || 'N/A'}
- **空间**: ${table.total_space_mb?.toFixed(2) || 'N/A'} MB
- **创建时间**: ${table.create_date}
- **修改时间**: ${table.modify_date}

#### 字段结构
| 字段名 | 数据类型 | 长度 | 精度 | 小数位 | 可空 | 主键 | 外键 | 描述 |
|--------|----------|------|------|--------|------|------|------|------|
`;

      for (const column of table.structure) {
        markdown += `| ${column.column_name} | ${column.data_type} | ${column.max_length || '-'} | ${column.precision || '-'} | ${column.scale || '-'} | ${column.is_nullable ? '是' : '否'} | ${column.key_type === 'PK' ? '是' : '否'} | ${column.key_type === 'FK' ? '是' : '否'} | ${column.description || '-'} |\n`;
      }

      markdown += `\n---\n\n`;
    }

    if (report.relationships.length > 0) {
      markdown += `## 外键关系

| 表名 | 字段 | 引用表 | 引用字段 |
|------|------|--------|----------|
`;
      for (const rel of report.relationships) {
        markdown += `| ${rel.table_name} | ${rel.column_name} | ${rel.referenced_table_name} | ${rel.referenced_column_name} |\n`;
      }
    }

    return markdown;
  }

  async run() {
    console.log('🚀 开始数据库分析...\n');

    if (!(await this.connect())) {
      return;
    }

    await this.getAllTables();
    await this.getForeignKeys();

    console.log('\n📊 生成分析报告...');
    const report = await this.generateReport();
    
    const jsonFile = await this.saveReport(report);
    if (jsonFile) {
      const markdown = await this.generateMarkdownReport(report);
      const mdFile = jsonFile.replace('.json', '.md');
      fs.writeFileSync(mdFile, markdown);
      console.log(`📄 Markdown报告已保存: ${mdFile}`);
    }

    console.log('\n✅ 数据库分析完成！');
    await sequelize.close();
  }
}

const analyzer = new DatabaseAnalyzer();
analyzer.run().catch(console.error); 