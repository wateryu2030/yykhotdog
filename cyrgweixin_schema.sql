-- cyrgweixin 数据库结构
-- 导出时间: 2025-10-19 18:23:27
-- 表数量: 57

-- 表: Annex
CREATE TABLE [Annex] (
    [id] int NOT NULL,
    [codeId] int,
    [codeName] varchar(50),
    [filePath] varchar(1000),
    [fileOldName] varchar(500),
    [fileNewName] varchar(500),
    [fileType] int,
    [sort] int,
    [isShow] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [extension] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: ceshi
CREATE TABLE [ceshi] (
    [id] bigint NOT NULL,
    [name] varchar(255),
    [sex] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: Change
CREATE TABLE [Change] (
    [ID] bigint NOT NULL,
    [ChangeText] varchar(MAX),
    [RecordID] int,
    [RecordTime] datetime DEFAULT (getdate()),
    [TableName] varchar(50),
    [delflag] bit DEFAULT ((0)),
    [ChangeType] varchar(50),
    [remarks] varchar(550),
    [Name] varchar(255),
    [Tel] varchar(255),
    [Type] int,
    PRIMARY KEY ([ID])
);

-- 表: convertName
CREATE TABLE [convertName] (
    [id] int NOT NULL,
    [oldName] varchar(350),
    [newName] varchar(350),
    [checkoutId] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: DH_Nav
CREATE TABLE [DH_Nav] (
    [id] bigint NOT NULL,
    [title] varchar(255),
    [ioc] varchar(255),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [href] varchar(1000),
    [sort] int DEFAULT ((0)),
    [isShow] int,
    [color] varchar(255),
    [bgColor] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: FilePath
CREATE TABLE [FilePath] (
    [id] int NOT NULL,
    [FileName] varchar(100),
    [FilePath] varchar(100),
    [RecordID] int,
    [RecordTime] datetime DEFAULT (getdate()),
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: LogonLog
CREATE TABLE [LogonLog] (
    [Id] int NOT NULL,
    [LoginAccount] varchar(500),
    [LoginNname] varchar(500),
    [LoginTime] varchar(500),
    [LoginIp] varchar(500),
    [Bz] varchar(5000),
    [dwId] int,
    PRIMARY KEY ([Id])
);

-- 表: MenuMain
CREATE TABLE [MenuMain] (
    [ID] bigint NOT NULL,
    [MenuName] varchar(50),
    [delflag] bit DEFAULT ((0)),
    [Icon] varchar(300),
    [RecordID] int,
    [RecordTime] datetime DEFAULT (getdate()),
    [Sort] int,
    [rightlevel] int,
    [ssxs] bit,
    [tubiao] nvarchar(500),
    PRIMARY KEY ([ID])
);

-- 表: MenuSub
CREATE TABLE [MenuSub] (
    [ID] bigint NOT NULL,
    [MenuName] varchar(50),
    [delflag] bit DEFAULT ((0)),
    [MenuMainID] int,
    [Icon] varchar(300),
    [RecordID] int,
    [RecordTime] datetime DEFAULT (getdate()),
    [Sort] int,
    [ssxs] bit,
    [tzdz] varchar(150),
    [ssdz] varchar(150),
    [ctrlName] varchar(550),
    PRIMARY KEY ([ID])
);

-- 表: OrderGoods
CREATE TABLE [OrderGoods] (
    [id] bigint NOT NULL,
    [orderId] bigint,
    [categoryId] int,
    [categoryName] varchar(150),
    [goodsId] int,
    [goodsName] varchar(150),
    [goodsText] varchar(350),
    [goodsNumber] int,
    [goodsPrice] decimal(18,2),
    [goodsTotal] decimal(18,2),
    [orderScore] int,
    [useScore] int,
    [isRefund] int,
    [refundMoney] decimal(18,2),
    [refundScore] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int DEFAULT ((0)),
    [shopId] int,
    [shopName] varchar(150),
    [standardPrice] decimal(18,2),
    [standardTotal] decimal(18,2),
    [otherTotal] decimal(18,2),
    [isPackage] int,
    [discountAmount] decimal(18,2),
    [realIncomeAmount] decimal(18,2),
    [costPrice] decimal(18,2),
    [profitPrice] decimal(18,2),
    [importData] varchar(50),
    [importTakeout] varchar(50),
    [goodsExchangeId] int,
    PRIMARY KEY ([id])
);

-- 表: Orders
CREATE TABLE [Orders] (
    [id] bigint NOT NULL,
    [payType] int,
    [payWay] int,
    [appId] varchar(50),
    [orderNo] varchar(50),
    [openId] varchar(50),
    [total] decimal(18,2),
    [prepay_id] varchar(350),
    [timeStampStr] varchar(50),
    [nonceStr] varchar(150),
    [payState] int,
    [refundMoney] decimal(18,2),
    [refundTime] varchar(50),
    [transaction_id] varchar(150),
    [success_time] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [deliverType] varchar(50),
    [deliverName] varchar(150),
    [deliverTel] varchar(150),
    [deliverAddress] varchar(350),
    [orderScore] int,
    [useScore] int,
    [orderRemarks] varchar(1000),
    [sendNo] varchar(350),
    [sendExpress] varchar(50),
    [delflag] int DEFAULT ((0)),
    [orderKey] varchar(50),
    [takeFoodsTime] varchar(50),
    [delState] varchar(50),
    [delTime] varchar(50),
    [shopId] int,
    [shopName] varchar(350),
    [tel] varchar(50),
    [orderValue] decimal(18,2),
    [couponUserId] int,
    [couponAmount] decimal(18,2),
    [messInfoState] int,
    [completeTime] varchar(50),
    [vipId] int,
    [vipAmount] decimal(18,2),
    [vipAmountZengSong] decimal(18,2),
    [payMode] varchar(50),
    [cash] decimal(18,2),
    [clientUserId] int,
    [vipTel] varchar(50),
    [lkltrade_no] varchar(150),
    [lkllog_no] varchar(150),
    [lklaccount_type] varchar(150),
    [lkltotal_amount] decimal(18,2),
    [lklpayer_amount] decimal(18,2),
    [lklacc_settle_amount] decimal(18,2),
    [lklacc_mdiscount_amount] decimal(18,2),
    [lklacc_discount_amount] decimal(18,2),
    [lklacc_other_discount_amount] varchar(150),
    [lkltrade_time] varchar(150),
    [lklremark] varchar(1000),
    [dayNumber] int,
    [isPrint] int,
    [printTime] varchar(50),
    [lklPayUserId] varchar(350),
    [costPrice] decimal(18,2),
    [profitPrice] decimal(18,2),
    [cardId] int,
    [cardAmount] decimal(18,2),
    [cardZengSong] decimal(18,2),
    [discount] decimal(18,2),
    [discountAmount] decimal(18,2),
    [rollsName] varchar(50),
    [rollsValue] decimal(18,2),
    [rollspayAmount] decimal(18,2),
    [rollsRealIncomeAmount] decimal(18,2),
    [groupPurchase] int,
    [takeoutName] varchar(50),
    [molingAmount] decimal(18,2),
    [ldhs_merchantId] varchar(50),
    [ldhs_orderNo] varchar(150),
    [ldhs_transType] int,
    [ldhs_subOpenid] varchar(150),
    [ldhs_channelTransOrderNo] varchar(150),
    [ldhs_receiptAmount] decimal(18,2),
    [ldhs_netAmount] decimal(18,2),
    [ldhs_chargeAmount] decimal(18,2),
    [ldhs_transRate] decimal(18,4),
    [ldhs_orderStatus] int,
    [ldhs_refundOrderNo] varchar(150),
    [importData] varchar(50),
    [importTakeout] varchar(50),
    [importUserAmount] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: PublicType
CREATE TABLE [PublicType] (
    [Id] bigint NOT NULL,
    [TypeName] varchar(255),
    [Name] varchar(255),
    [RecordTime] varchar(255),
    [RecordId] int,
    [Sort] int,
    [Delflag] int DEFAULT ((0)),
    PRIMARY KEY ([Id])
);

-- 表: rg_CheckoutType
CREATE TABLE [rg_CheckoutType] (
    [id] int NOT NULL,
    [checkoutName] varchar(150),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [sort] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_Consumption
CREATE TABLE [Rg_Consumption] (
    [Id] int NOT NULL,
    [ShopId] int,
    [Type] varchar(255),
    [Remarks] varchar(1000),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Money] decimal(18,2),
    [Time] varchar(255),
    PRIMARY KEY ([Id])
);

-- 表: rg_OrderDetailsImport
CREATE TABLE [rg_OrderDetailsImport] (
    [id] int NOT NULL,
    [shopId] int,
    [checkoutId] int,
    [orderId] int,
    [cpmc] varchar(450),
    [xssl] int,
    [rq] varchar(250),
    [jzsj] varchar(250),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [cptm] varchar(350),
    [bz] varchar(2350),
    [importType] int,
    [sjje] decimal(20,2),
    [ysje] decimal(20,2),
    [ssje] decimal(20,2),
    [yhje] decimal(20,2),
    PRIMARY KEY ([id])
);

-- 表: rg_OrderImport
CREATE TABLE [rg_OrderImport] (
    [id] int NOT NULL,
    [shopId] int,
    [checkoutId] int,
    [rq] varchar(50),
    [mdmc] varchar(250),
    [cpmc] varchar(250),
    [jzsj] varchar(250),
    [xssl] int,
    [ysje] decimal(18,2),
    [yhje] decimal(18,2),
    [ssje] decimal(18,2),
    [zkmc] varchar(250),
    [cxgzm] varchar(350),
    [qd] varchar(250) NOT NULL,
    [syy] varchar(250),
    [djlsh] varchar(250),
    [sftc] varchar(50),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [importType] int,
    PRIMARY KEY ([id])
);

-- 表: rg_Package
CREATE TABLE [rg_Package] (
    [id] int NOT NULL,
    [PackageName] varchar(350),
    [checkoutId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] nchar(50),
    PRIMARY KEY ([id])
);

-- 表: rg_PackageInfo
CREATE TABLE [rg_PackageInfo] (
    [id] int NOT NULL,
    [packageId] int,
    [goodsName] varchar(350),
    [goodsNumer] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [checkoutId] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_Patrol
CREATE TABLE [Rg_Patrol] (
    [Id] int NOT NULL,
    [ShopId] int,
    [Remarks] varchar(1000),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [startDate] varchar(255),
    [endDate] varchar(255),
    [score] decimal(18,2),
    [score1] decimal(18,2),
    [score2] decimal(18,2),
    [sign1] varchar(255),
    [sign2] varchar(255),
    [reportPath] varchar(255),
    [reportState] int,
    PRIMARY KEY ([Id])
);

-- 表: Rg_PatrolBzfs
CREATE TABLE [Rg_PatrolBzfs] (
    [id] int NOT NULL,
    [shopId] float,
    [bz] float,
    [delflag] int DEFAULT ((0)),
    [mfs] float,
    [type] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_PatrolBzjg
CREATE TABLE [Rg_PatrolBzjg] (
    [id] int NOT NULL,
    [isYye] int,
    [isKdj] int,
    [isDs] int DEFAULT ((0)),
    [isMll] int,
    [jg] varchar(500),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_PatrolBzz
CREATE TABLE [Rg_PatrolBzz] (
    [id] int NOT NULL,
    [zb] float,
    [fsb] float,
    [delflag] int DEFAULT ((0)),
    [type] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_PatrolItem
CREATE TABLE [Rg_PatrolItem] (
    [Id] int NOT NULL,
    [name] varchar(255),
    [Remarks] varchar(1000),
    [sort] int,
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [TotalScore] float,
    PRIMARY KEY ([Id])
);

-- 表: Rg_PatrolItemRecord
CREATE TABLE [Rg_PatrolItemRecord] (
    [Id] int NOT NULL,
    [patrolId] int,
    [patrolItemId] int,
    [itemName] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [ShopId] int,
    [Score] float,
    [TotalScore] float,
    [Suggestion] varchar(500),
    [startDate] varchar(255),
    [endDate] varchar(255),
    [days] int,
    PRIMARY KEY ([Id])
);

-- 表: Rg_PatrolItemSub
CREATE TABLE [Rg_PatrolItemSub] (
    [Id] int NOT NULL,
    [name] varchar(255),
    [Remarks] varchar(1000),
    [sort] int,
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [itemId] int,
    [suggestion] varchar(500),
    PRIMARY KEY ([Id])
);

-- 表: Rg_PatrolRecord
CREATE TABLE [Rg_PatrolRecord] (
    [Id] int NOT NULL,
    [PatrolId] int,
    [Remarks] varchar(1000),
    [Score] float,
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [ShopId] int,
    [PatrolItemId] int,
    [Type] int,
    [IsQualified] int,
    [ItemName] varchar(255),
    [ItemSubName] varchar(255),
    [patrolItemSubId] int,
    [suggestion] varchar(500),
    PRIMARY KEY ([Id])
);

-- 表: Rg_PatrolRecord_Jy
CREATE TABLE [Rg_PatrolRecord_Jy] (
    [Id] int NOT NULL,
    [shopId] int,
    [PatrolId] int,
    [itemSubId] int,
    [itemSubName] varchar(255),
    [score] float,
    [bzfs] float,
    [mffs] float,
    [remarks] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Avg] float,
    PRIMARY KEY ([Id])
);

-- 表: Rg_Sample
CREATE TABLE [Rg_Sample] (
    [Id] int NOT NULL,
    [Name] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Type_Id] int,
    [PeriodId] int,
    PRIMARY KEY ([Id])
);

-- 表: Rg_Sample_Period
CREATE TABLE [Rg_Sample_Period] (
    [id] bigint NOT NULL,
    [title] varchar(255),
    [startTime] varchar(255),
    [endTime] varchar(255),
    [rule] varchar(500),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [report] varchar(255),
    [img] varchar(255),
    [address] varchar(500),
    PRIMARY KEY ([id])
);

-- 表: Rg_Sample_Score
CREATE TABLE [Rg_Sample_Score] (
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Score] float,
    [id] int NOT NULL,
    [PeriodId] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_Sample_Score_Record
CREATE TABLE [Rg_Sample_Score_Record] (
    [RecordId] int NOT NULL,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Score] float,
    [id] int NOT NULL,
    [scordId] int,
    [sampleId] int,
    [sampleTypeId] int,
    [scorekw] float,
    [scorecx] float,
    [PeriodId] int,
    PRIMARY KEY ([id])
);

-- 表: Rg_Sample_Type
CREATE TABLE [Rg_Sample_Type] (
    [Id] int NOT NULL,
    [Name] nvarchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [Sort] int,
    [PeriodId] int,
    PRIMARY KEY ([Id])
);

-- 表: Rg_SeekShop
CREATE TABLE [Rg_SeekShop] (
    [Id] int NOT NULL,
    [ShopName] varchar(255),
    [ShopAddress] varchar(255),
    [location] varchar(255),
    [blurb] varchar(1000),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [approvalId] int,
    [approvalTime] varchar(255),
    [approvalState] varchar(255),
    [approvalRemarks] varchar(1000),
    [amount] decimal(18,2),
    PRIMARY KEY ([Id])
);

-- 表: Rg_Shop
CREATE TABLE [Rg_Shop] (
    [Id] int NOT NULL,
    [ShopName] varchar(100),
    [ShopAddress] varchar(255),
    [Director] varchar(255),
    [DirectorPhone] varchar(255),
    [FirstImg] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    [location] varchar(255),
    [state] int,
    [isUse] int,
    [blurb] nvarchar(MAX),
    [rent] decimal(18,2),
    [province] varchar(255),
    [city] varchar(255),
    [district] varchar(255),
    [morningTime] nvarchar(255),
    [nightTime] varchar(255),
    [passengerFlow] varchar(255),
    [interval] int,
    [zxfy] decimal(18,2),
    [sbfy] decimal(18,2),
    [jmfy] decimal(18,2),
    [rgfy] decimal(18,2),
    [sdfy] decimal(18,2),
    [mlr] decimal(18,2),
    [yyts] int,
    [mlrl] decimal(18,2),
    [ryye] decimal(18,2),
    [yxse] decimal(18,2),
    [cstz] decimal(18,2),
    [yycby] decimal(18,2),
    [tzhsq] decimal(18,2),
    [isClose] int
);

-- 表: Rg_ShopPrepare
CREATE TABLE [Rg_ShopPrepare] (
    [id] int NOT NULL,
    [shopId] int,
    [prepareTypeId] varchar(255),
    [money] decimal(18,2),
    [remarks] varchar(1000),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [time] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: Rg_ShopPrepareType
CREATE TABLE [Rg_ShopPrepareType] (
    [id] int NOT NULL,
    [name] varchar(255),
    [icon] varchar(255),
    [remarks] varchar(1000),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int DEFAULT ((0)),
    [isShow] int,
    PRIMARY KEY ([id])
);

-- 表: RgBack_OrderGoods
CREATE TABLE [RgBack_OrderGoods] (
    [id] bigint NOT NULL,
    [selfId] int,
    [orderId] bigint,
    [categoryId] int,
    [categoryName] varchar(150),
    [goodsId] int,
    [goodsName] varchar(150),
    [goodsText] varchar(350),
    [goodsNumber] int,
    [goodsPrice] decimal(18,2),
    [goodsTotal] decimal(18,2),
    [orderScore] int,
    [useScore] int,
    [isRefund] int,
    [refundMoney] decimal(18,2),
    [refundScore] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [shopId] int,
    [shopName] varchar(150),
    [standardPrice] decimal(18,2),
    [standardTotal] decimal(18,2),
    [otherTotal] decimal(18,2),
    [isPackage] int,
    [discountAmount] decimal(18,2),
    [realIncomeAmount] decimal(18,2),
    [costPrice] decimal(18,2),
    [profitPrice] decimal(18,2),
    [importData] varchar(50),
    [importTakeout] varchar(50),
    [goodsExchangeId] int,
    PRIMARY KEY ([id])
);

-- 表: RgBack_OrderGoodsSpec
CREATE TABLE [RgBack_OrderGoodsSpec] (
    [id] int NOT NULL,
    [selfId] int,
    [specId] int,
    [specName] varchar(300),
    [specPrice] decimal(18,2),
    [specNumber] int,
    [specTotal] decimal(18,2),
    [orderId] int,
    [orderGoodsId] int,
    [goodsId] int,
    [shopId] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [type] int,
    [discountAmount] decimal(18,2),
    [realIncomeAmount] decimal(18,2),
    [costPrice] decimal(18,2),
    [profitPrice] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: RgBack_Orders
CREATE TABLE [RgBack_Orders] (
    [id] bigint NOT NULL,
    [selfId] int,
    [payType] int,
    [payWay] int,
    [appId] varchar(50),
    [orderNo] varchar(50),
    [openId] varchar(50),
    [total] decimal(18,2),
    [prepay_id] varchar(350),
    [timeStampStr] varchar(50),
    [nonceStr] varchar(150),
    [payState] int,
    [refundMoney] decimal(18,2),
    [refundTime] varchar(50),
    [transaction_id] varchar(150),
    [success_time] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [deliverType] varchar(50),
    [deliverName] varchar(150),
    [deliverTel] varchar(150),
    [deliverAddress] varchar(350),
    [orderScore] int,
    [useScore] int,
    [orderRemarks] varchar(1000),
    [sendNo] varchar(350),
    [sendExpress] varchar(50),
    [delflag] int,
    [orderKey] varchar(50),
    [takeFoodsTime] varchar(50),
    [delState] varchar(50),
    [delTime] varchar(50),
    [shopId] int,
    [shopName] varchar(350),
    [tel] varchar(50),
    [orderValue] decimal(18,2),
    [couponUserId] int,
    [couponAmount] decimal(18,2),
    [messInfoState] int,
    [completeTime] varchar(50),
    [vipId] int,
    [vipAmount] decimal(18,2),
    [vipAmountZengSong] decimal(18,2),
    [payMode] varchar(50),
    [cash] decimal(18,2),
    [clientUserId] int,
    [vipTel] varchar(50),
    [lkltrade_no] varchar(150),
    [lkllog_no] varchar(150),
    [lklaccount_type] varchar(150),
    [lkltotal_amount] decimal(18,2),
    [lklpayer_amount] decimal(18,2),
    [lklacc_settle_amount] decimal(18,2),
    [lklacc_mdiscount_amount] decimal(18,2),
    [lklacc_discount_amount] decimal(18,2),
    [lklacc_other_discount_amount] varchar(150),
    [lkltrade_time] varchar(150),
    [lklremark] varchar(1000),
    [dayNumber] int,
    [isPrint] int,
    [printTime] varchar(50),
    [lklPayUserId] varchar(350),
    [costPrice] decimal(18,2),
    [profitPrice] decimal(18,2),
    [cardId] int,
    [cardAmount] decimal(18,2),
    [cardZengSong] decimal(18,2),
    [discount] decimal(18,2),
    [discountAmount] decimal(18,2),
    [rollsName] varchar(50),
    [rollsValue] decimal(18,2),
    [rollspayAmount] decimal(18,2),
    [rollsRealIncomeAmount] decimal(18,2),
    [groupPurchase] int,
    [takeoutName] varchar(50),
    [molingAmount] decimal(18,2),
    [ldhs_merchantId] varchar(50),
    [ldhs_orderNo] varchar(150),
    [ldhs_transType] int,
    [ldhs_subOpenid] varchar(150),
    [ldhs_channelTransOrderNo] varchar(150),
    [ldhs_receiptAmount] decimal(18,2),
    [ldhs_netAmount] decimal(18,2),
    [ldhs_chargeAmount] decimal(18,2),
    [ldhs_transRate] decimal(18,4),
    [ldhs_orderStatus] int,
    [ldhs_refundOrderNo] varchar(150),
    [importData] varchar(50),
    [importTakeout] varchar(50),
    [importUserAmount] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: Role
CREATE TABLE [Role] (
    [ID] int NOT NULL,
    [RoleName] varchar(100),
    [RecordID] int,
    [delflag] bit DEFAULT ((0)),
    [RecordTime] datetime DEFAULT (getdate()),
    [EnterpriseID] int,
    [menumainid] varchar(2000),
    [menusubid] varchar(2000),
    [isoldrole] varchar(50),
    PRIMARY KEY ([ID])
);

-- 表: ShopLease
CREATE TABLE [ShopLease] (
    [id] int NOT NULL,
    [shopId] int,
    [name] varchar(255),
    [tel] varchar(255),
    [money] decimal(18,2),
    [startTime] nvarchar(255),
    [endTime] varchar(255),
    [remarks] varchar(1000),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: TelCode
CREATE TABLE [TelCode] (
    [id] bigint NOT NULL,
    [tel] varchar(255),
    [code] varchar(255),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [type] int,
    PRIMARY KEY ([id])
);

-- 表: User
CREATE TABLE [User] (
    [ID] int NOT NULL,
    [LoginName] varchar(50),
    [LoginPassword] varchar(100),
    [TrueName] varchar(50),
    [Tel] varchar(50),
    [dwId] int,
    [Sex] nvarchar(50),
    [DepartID] varchar(500),
    [RoleID] varchar(1000),
    [RecordID] int,
    [RecordTime] datetime DEFAULT (getdate()),
    [delflag] bit DEFAULT ((0)),
    [IsManager] int DEFAULT ((0)),
    [x_password] varchar(100),
    [x_state] int,
    [x_openid] varchar(100),
    [x_nickName] varchar(300),
    [x_headimgurl] varchar(300),
    [x_gzhOpenId] varchar(100),
    [x_isLog] int DEFAULT ((0)),
    [x_recordTime] varchar(100),
    [x_sfsld] varchar(50),
    [yxq] varchar(50),
    [x_sfkysq] int DEFAULT ((2)),
    [show] int DEFAULT ((0)),
    [isPush] int DEFAULT ((0)),
    [province] varchar(255),
    [city] varchar(255),
    [area] varchar(255),
    [ztlx] varchar(255),
    [dwmc] varchar(255),
    [sfzh] varchar(500),
    [x_role] int DEFAULT ((0)),
    [sfzImg] varchar(500),
    [yyzzImg] varchar(500),
    [provinceCode] varchar(255),
    [cityCode] varchar(255),
    [areaCode] varchar(255),
    [Fpje] decimal(18,2),
    [rgShopPower] varchar(255),
    PRIMARY KEY ([ID])
);

-- 表: XcxAccessToken
CREATE TABLE [XcxAccessToken] (
    [id] int NOT NULL,
    [accessToken] varchar(MAX),
    [recordTime] varchar(50),
    [type] int,
    PRIMARY KEY ([id])
);

-- 表: XcxLog
CREATE TABLE [XcxLog] (
    [id] bigint NOT NULL,
    [recordTime] varchar(255),
    [delflag] int DEFAULT ((0)),
    [userId] int,
    [name] varchar(255),
    [tel] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: XcxNav
CREATE TABLE [XcxNav] (
    [id] bigint NOT NULL,
    [title] varchar(1000),
    [ioc] varchar(255),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [href] varchar(1000),
    [sort] int DEFAULT ((0)),
    [isShow] int,
    [parentId] int,
    [color] varchar(255),
    [bgColor] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: XcxNews
CREATE TABLE [XcxNews] (
    [id] bigint NOT NULL,
    [title] varchar(1000),
    [firstImg] varchar(1000),
    [content] nvarchar(MAX),
    [click] varchar(255) DEFAULT ((0)),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [isShow] int DEFAULT ((1)),
    [type] int,
    PRIMARY KEY ([id])
);

-- 表: XcxPrize
CREATE TABLE [XcxPrize] (
    [id] bigint NOT NULL,
    [name] varchar(255),
    [startTime] varchar(255),
    [endTime] varchar(255),
    [rule] varchar(500),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: XcxPrizeAwards
CREATE TABLE [XcxPrizeAwards] (
    [id] bigint NOT NULL,
    [prizeId] int,
    [name] varchar(255),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: XcxPrizeRecord
CREATE TABLE [XcxPrizeRecord] (
    [id] bigint NOT NULL,
    [prizeId] int,
    [awardsId] int,
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [isReceive] int,
    [receiveRecordId] int,
    [receiveTime] varchar(255),
    [receivePeople] varchar(255),
    [receiveNotes] varchar(500),
    PRIMARY KEY ([id])
);

-- 表: XcxProduct
CREATE TABLE [XcxProduct] (
    [id] bigint NOT NULL,
    [title] varchar(800),
    [firstImg] varchar(1000),
    [content] nvarchar(MAX),
    [click] varchar(255) DEFAULT ((0)),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [isShow] int DEFAULT ((1)),
    [type] int,
    [brief] varchar(1000),
    [xcxAppid] varchar(255),
    [xcxHref] varchar(255),
    [kfsj] varchar(255),
    [yhsl] varchar(255),
    [xsje] varchar(255),
    [sort] int,
    PRIMARY KEY ([id])
);

-- 表: XcxPushMessage
CREATE TABLE [XcxPushMessage] (
    [id] int NOT NULL,
    [recordTime] varchar(255),
    [delflag] int DEFAULT ((0)),
    [sjrId] int,
    [nr] varchar(1000),
    [zt] varchar(255),
    [isSee] int DEFAULT ((0)),
    [seeTime] varchar(255),
    [fqr] varchar(255),
    [yy] varchar(1000),
    PRIMARY KEY ([id])
);

-- 表: XcxSearchRecord
CREATE TABLE [XcxSearchRecord] (
    [id] int NOT NULL,
    [content] varchar(MAX),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] int DEFAULT ((0)),
    [dwId] int,
    PRIMARY KEY ([id])
);

-- 表: XcxUser
CREATE TABLE [XcxUser] (
    [Id] int NOT NULL,
    [Name] varchar(100),
    [Sfz] varchar(255),
    [Sex] varchar(255),
    [Tel] varchar(255),
    [OpenId] varchar(255),
    [State] varchar(255),
    [NickName] varchar(255),
    [Headimgurl] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [registerTime] varchar(255),
    [RecordTime] varchar(255),
    [roleId] int,
    [navIds] varchar(500),
    [remarks] nvarchar(MAX),
    [isManager] int,
    [navSonIds] varchar(500),
    [shopPower] varchar(255),
    [isPrize] int,
    [isSeekShop] int,
    [isSeekShopApprova] int,
    [isShopManager] int DEFAULT ((0)),
    [isAuthorize] int,
    [Anchorfakeid] varchar(255),
    [isPower] int,
    PRIMARY KEY ([Id])
);

-- 表: XcxUserPower
CREATE TABLE [XcxUserPower] (
    [Id] bigint NOT NULL,
    [XcxUserId] int,
    [DH_StoreIds] varchar(500),
    [RecordId] int,
    [RecordTime] varchar(255),
    [Delflag] bit DEFAULT ((0)),
    [IsShow] int,
    [DH_Role] int,
    [Name] varchar(255),
    [IsSjkb] int,
    [city] varchar(255),
    [cityCoordinates] varchar(255),
    [HomeNav] varchar(500),
    [isPopularShop] int,
    PRIMARY KEY ([Id])
);

-- 表: XcxVersionRecord
CREATE TABLE [XcxVersionRecord] (
    [id] bigint NOT NULL,
    [versionId] int,
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    PRIMARY KEY ([id])
);

-- 表: XcxVersions
CREATE TABLE [XcxVersions] (
    [id] bigint NOT NULL,
    [versionNumber] varchar(1000),
    [content] nvarchar(MAX),
    [recordId] int,
    [recordTime] varchar(255),
    [delflag] bit DEFAULT ((0)),
    [isShow] int DEFAULT ((1)),
    [versionTime] varchar(255),
    PRIMARY KEY ([id])
);

