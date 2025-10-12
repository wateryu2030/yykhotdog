# hotdog2030 数据库一键迁移/重构说明

## 1. 新表结构初始化

1. 修改 `init.sql` 连接信息，使用 SQL Server Management Studio 或命令行执行建表脚本。
2. 确认所有表、索引、外键均已创建。

## 2. 字段映射配置

- 参考 `mapping_config.py`，如有自定义字段请补充。

## 3. 数据迁移脚本

- 修改 `migrate_data.py` 里的数据库连接串（账号、密码、库名）。
- 安装依赖：
  ```bash
  pip install pandas sqlalchemy pymssql
  ```
- 运行迁移脚本：
  ```bash
  python migrate_data.py
  ```
- 如有脏数据/不规范数据，可在 `etl_utils.py` 增加清洗逻辑。

## 4. 常见问题

- 外键映射失败：请确保 city/shop/customer 等主表先迁移。
- 唯一索引冲突：请先用 `drop_duplicates` 去重。
- 迁移后如有数据缺失，请检查字段映射和清洗逻辑。

## 5. 迁移完成后

- 所有新开发/分析/接口均基于新表结构。
- 建议定期备份新库，保障数据安全。

---
如需定制迁移脚本或有特殊业务需求，请联系数据团队。 