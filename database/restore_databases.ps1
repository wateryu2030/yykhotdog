# 数据库恢复脚本
# 用于从备份文件恢复 cyrg2025 和 cyrgweixin 数据库

# 数据库连接参数
$Server = "rm-2ze8w8j3h8x8k8h5o.mssql.rds.aliyuncs.com,1433"
$Username = "cyrg2025"
$Password = "Cyrg2025!@#"

# 备份文件路径
$CyrgBackup = "C:\Users\weijunyu\zhhotdog\database\cyrg_backup_2025_09_09_000004_9004235.bak"
$ZhkjBackup = "C:\Users\weijunyu\zhhotdog\database\zhkj_backup_2025_09_09_000002_6761311.bak"

Write-Host "开始数据库恢复操作..." -ForegroundColor Green
Write-Host "=" * 60

try {
    # 1. 恢复 cyrg2025 数据库
    Write-Host "`n1. 恢复 cyrg2025 数据库" -ForegroundColor Yellow
    Write-Host "-" * 40
    
    $CyrgRestoreSQL = @"
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrg2025')
BEGIN
    ALTER DATABASE [cyrg2025] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrg2025];
END

-- 恢复数据库
RESTORE DATABASE [cyrg2025] 
FROM DISK = '$CyrgBackup'
WITH 
    MOVE 'cyrg' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrg2025.mdf',
    MOVE 'cyrg_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrg2025_log.ldf',
    REPLACE;
"@

    Invoke-Sqlcmd -ServerInstance $Server -Username $Username -Password $Password -Query $CyrgRestoreSQL
    Write-Host "cyrg2025 数据库恢复成功！" -ForegroundColor Green

    # 2. 恢复 cyrgweixin 数据库
    Write-Host "`n2. 恢复 cyrgweixin 数据库" -ForegroundColor Yellow
    Write-Host "-" * 40
    
    $ZhkjRestoreSQL = @"
-- 删除现有数据库
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'cyrgweixin')
BEGIN
    ALTER DATABASE [cyrgweixin] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [cyrgweixin];
END

-- 恢复数据库
RESTORE DATABASE [cyrgweixin] 
FROM DISK = '$ZhkjBackup'
WITH 
    MOVE 'zhkj' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrgweixin.mdf',
    MOVE 'zhkj_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\cyrgweixin_log.ldf',
    REPLACE;
"@

    Invoke-Sqlcmd -ServerInstance $Server -Username $Username -Password $Password -Query $ZhkjRestoreSQL
    Write-Host "cyrgweixin 数据库恢复成功！" -ForegroundColor Green

    # 3. 验证数据库恢复结果
    Write-Host "`n3. 验证数据库恢复结果" -ForegroundColor Yellow
    Write-Host "-" * 40
    
    $VerifySQL = @"
SELECT name, database_id, create_date 
FROM sys.databases 
WHERE name IN ('cyrg2025', 'cyrgweixin')
ORDER BY name;
"@

    $Results = Invoke-Sqlcmd -ServerInstance $Server -Username $Username -Password $Password -Query $VerifySQL
    
    Write-Host "数据库恢复验证结果:" -ForegroundColor Cyan
    Write-Host "-" * 50
    foreach ($Row in $Results) {
        Write-Host "数据库名称: $($Row.name)"
        Write-Host "数据库ID: $($Row.database_id)"
        Write-Host "创建日期: $($Row.create_date)"
        Write-Host "-" * 50
    }

    Write-Host "`n✅ 所有数据库恢复操作完成！" -ForegroundColor Green

} catch {
    Write-Host "`n❌ 数据库恢复操作失败: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "请检查错误信息并重试" -ForegroundColor Red
}

Write-Host "`n按任意键退出..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
