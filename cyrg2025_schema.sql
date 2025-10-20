-- cyrg2025 数据库结构
-- 导出时间: 2025-10-19 12:52:04
-- 表数量: 99

-- 表: AccountStatement
CREATE TABLE [AccountStatement] (
    [id] int NOT NULL,
    [shopId] int,
    [shopName] varchar(50),
    [recordTime] varchar(50),
    [settlementDate] varchar(50),
    [billAmount] decimal(18,2),
    [settlementAmount] decimal(18,2),
    [chargeAmount] decimal(18,2),
    [chargeRate] decimal(18,3),
    [xcxFromDate] varchar(50),
    [xcxAmount] decimal(18,2),
    [xcxNumber] int,
    [xcxDay] int,
    [posFromDate] varchar(50),
    [posAmount] decimal(18,2),
    [posNumber] int,
    [posDay] int,
    [cashVipAmount] decimal(18,2),
    [posVipCancelAmount] decimal(18,2),
    [delflag] int,
    [isComplete] int,
    [completeTime] varchar(50),
    [completeUserId] int,
    [xcxRefundAmount] decimal(18,2),
    [xcxRefundNumber] int,
    [posRefundAmount] decimal(18,2),
    [posRefundNumber] int,
    [createId] int,
    [createTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: AccountStatementConfirm
CREATE TABLE [AccountStatementConfirm] (
    [id] bigint NOT NULL,
    [shopName] varchar(350),
    [shopId] int,
    [createId] int,
    [amount] decimal(18,2),
    [recordId] int,
    [recordTime] varchar(50),
    [confirmRecordId] int,
    [confirmRecordTime] varchar(50),
    [payState] int,
    [delflag] int,
    [remarks] varchar(2000),
    PRIMARY KEY ([id])
);

-- 表: AccountStatementCreate
CREATE TABLE [AccountStatementCreate] (
    [id] int NOT NULL,
    [shopId] int,
    [shopName] varchar(50),
    [settlementDate] varchar(50),
    [billAmount] decimal(18,2),
    [settlementAmount] decimal(18,2),
    [chargeAmount] decimal(18,2),
    [xcxAmount] decimal(18,2),
    [xcxNumber] int,
    [posAmount] decimal(18,2),
    [posNumber] int,
    [cashVipAmount] decimal(18,2),
    [posVipCancelAmount] decimal(18,2),
    [xcxRefundAmount] decimal(18,2),
    [xcxRefundNumber] int,
    [posRefundAmount] decimal(18,2),
    [posRefundNumber] int,
    [isComplete] int,
    [completeTime] varchar(50),
    [completeUserId] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [days] int,
    [isPublish] int,
    [publishTime] varchar(50),
    [publishUserId] int,
    [delUserId] int,
    [delTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: AccountStatementDetails
CREATE TABLE [AccountStatementDetails] (
    [id] int NOT NULL,
    [shopId] int,
    [shopName] varchar(150),
    [payMode] varchar(50),
    [typeStr] varchar(50),
    [accountStatementId] int,
    [orderId] int,
    [total] decimal(18,2),
    [vipAmount] decimal(18,2),
    [cash] decimal(18,2),
    [success_time] varchar(50),
    [payState] int,
    [recordTime] varchar(50),
    [orderNo] varchar(150),
    [refundTime] varchar(50),
    [delflag] int,
    [createId] int,
    [completeTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: AccountStatementOrders
CREATE TABLE [AccountStatementOrders] (
    [id] int NOT NULL,
    [confirmId] bigint,
    [createId] int,
    [shopId] int,
    [shopName] varchar(150),
    [payState] int,
    [amount] decimal(18,2),
    [transCode] varchar(150),
    [tranDate] varchar(50),
    [tranTime] varchar(50),
    [fSeqNo] varchar(50),
    [saasName] varchar(150),
    [uniBusiId] varchar(50),
    [iSeqNo] varchar(50),
    [bankName] varchar(50),
    [payeeName] varchar(150),
    [bankCard] varchar(50),
    [payerName] varchar(150),
    [retCode] varchar(50),
    [retMsg] varchar(150),
    [retSerialNo] varchar(150),
    [retMsgId] varchar(50),
    [retResult] varchar(150),
    [delflag] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

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
    [fileZIPName] varchar(500),
    [rootPath] varchar(500),
    PRIMARY KEY ([id])
);

-- 表: CardStorage
CREATE TABLE [CardStorage] (
    [Id] bigint NOT NULL,
    [realMoney] decimal(18,2),
    [giveMoney] decimal(18,2),
    [RecordTime] varchar(100),
    [RecordId] int,
    [isShow] nvarchar(MAX),
    [Delflag] int DEFAULT ((0)),
    PRIMARY KEY ([Id])
);

-- 表: CardVip
CREATE TABLE [CardVip] (
    [id] int NOT NULL,
    [vipNum] varchar(50),
    [vipTel] varchar(50),
    [vipCard] varchar(50),
    [recordTime] varchar(50),
    [delflag] int,
    [vipName] varchar(50),
    [remarks] varchar(2050),
    [vipPassword] varchar(50),
    [shopId] int,
    [shopName] varchar(150),
    [chongzhi] decimal(18,2),
    [zengsong] decimal(18,2),
    [vipAmount11111] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: CardVipRecord
CREATE TABLE [CardVipRecord] (
    [id] int NOT NULL,
    [vipId] int,
    [payType] varchar(50),
    [recordType] varchar(50),
    [recordAmount] decimal(18,2),
    [orderId] int,
    [recordTime] varchar(50),
    [useType] varchar(50),
    [delflag] int,
    [recordText] varchar(1000),
    [shopId] int,
    [shopName] varchar(150),
    PRIMARY KEY ([id])
);

-- 表: Category
CREATE TABLE [Category] (
    [id] int NOT NULL,
    [catName] varchar(150),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [catSort] int,
    [shopId] int,
    [storeId] int,
    [catSortXcx] int,
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
    [Remarks] varchar(550),
    [Name] varchar(255),
    [Tel] varchar(255),
    [Type] int,
    PRIMARY KEY ([ID])
);

-- 表: City
CREATE TABLE [City] (
    [id] int NOT NULL,
    [cityName] varchar(50),
    [cityCode] varchar(50),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [sort] int,
    PRIMARY KEY ([id])
);

-- 表: Client_DHUser
CREATE TABLE [Client_DHUser] (
    [id] int NOT NULL,
    [userName] varchar(50),
    [userPassword] varchar(50),
    [trueName] varchar(50),
    [tel] varchar(50),
    [StoreId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [wsCode] varchar(50),
    [wsCodeTime] varchar(50),
    [userKey] varchar(50),
    [versionNo] varchar(50),
    [isWs] int,
    PRIMARY KEY ([id])
);

-- 表: ClientUser
CREATE TABLE [ClientUser] (
    [id] int NOT NULL,
    [userName] varchar(50),
    [userPassword] varchar(50),
    [trueName] varchar(50),
    [tel] varchar(50),
    [shopId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [wsCode] varchar(50),
    [wsCodeTime] varchar(50),
    [userKey] varchar(50),
    [versionNo] varchar(50),
    [isWsUpdate] int,
    PRIMARY KEY ([id])
);

-- 表: clientUserOrders
CREATE TABLE [clientUserOrders] (
    [id] int NOT NULL,
    [userName] varchar(50),
    [userPassword] varchar(50),
    [trueName] varchar(50),
    [tel] varchar(50),
    [wsCode] varchar(50),
    [wsCodeTime] varchar(50),
    [versionNo] varchar(50),
    [userKey] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: Coupon
CREATE TABLE [Coupon] (
    [id] int NOT NULL,
    [couponType] int,
    [couponName] varchar(50),
    [startDate] varchar(50),
    [endDate] varchar(50),
    [couponAmount] decimal(18,2),
    [minUseAmount] decimal(18,2),
    [number] int,
    [isEnable] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [shopId] int,
    [weekDay] int,
    [notes] varchar(500),
    PRIMARY KEY ([id])
);

-- 表: CouponDetails
CREATE TABLE [CouponDetails] (
    [id] int NOT NULL,
    [couponId] int,
    [couponAmount] decimal(18,2),
    [minUseAmount] decimal(18,2),
    [percents] decimal(18,2),
    [number] int,
    [defaultNumber] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: CouponShop
CREATE TABLE [CouponShop] (
    [id] int NOT NULL,
    [couponId] int,
    [shopId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: CouponUser
CREATE TABLE [CouponUser] (
    [id] int NOT NULL,
    [userId] int,
    [couponId] int,
    [couponDetailsId] int,
    [couponName] varchar(500),
    [startDate] varchar(255),
    [endDate] varchar(255),
    [couponAmount] decimal(18,2),
    [minUseAmount] decimal(18,2),
    [isUse] int,
    [useTime] varchar(255),
    [isSystemDistribution] int,
    [recordTime] varchar(255),
    [delflag] int,
    [shopId] int,
    PRIMARY KEY ([id])
);

-- 表: DH_Category
CREATE TABLE [DH_Category] (
    [id] int NOT NULL,
    [catName] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [sort] int,
    [storeId] int,
    PRIMARY KEY ([id])
);

-- 表: DH_Goods
CREATE TABLE [DH_Goods] (
    [id] int NOT NULL,
    [storeId] int,
    [categoryId] int,
    [goodsName] varchar(255),
    [goodsText] varchar(255),
    [goodsImg] varchar(1250),
    [isSale] int,
    [salePrice] decimal(18,2),
    [goodsStock] int,
    [sort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [goodsCode] varchar(255),
    [goodsName1] varchar(255),
    [goodsSpecs] varchar(255),
    [goodsUnit] varchar(255),
    [TemplateId] int,
    [specsNumber] decimal(18,2),
    [imgPath] varchar(255),
    [imgName] varchar(255),
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
    PRIMARY KEY ([id])
);

-- 表: DH_OrderGoods
CREATE TABLE [DH_OrderGoods] (
    [id] int NOT NULL,
    [storeId] int,
    [storeName] varchar(150),
    [categoryId] int,
    [orderId] int,
    [categoryName] varchar(150),
    [goodsId] int,
    [goodsName] varchar(150),
    [goodsText] varchar(150),
    [goodsNumber] int,
    [goodsPrice] decimal(18,2),
    [goodsTotal] decimal(18,2),
    [isRefund] int,
    [refundMoney] decimal(18,2),
    [recordId] int,
    [recordTime] varchar(150),
    [delflag] int,
    [goodsNo] varchar(50),
    [goodsPrintName] varchar(150),
    [goodsSpec] varchar(150),
    [goodsUnit] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: DH_OrderGoodsDate
CREATE TABLE [DH_OrderGoodsDate] (
    [id] int NOT NULL,
    [orderGoodsName] varchar(150),
    [orderGoodsDate] varchar(50),
    [orderGoodsReamrks] varchar(2050),
    [storeId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: DH_OrderGoodsInfo
CREATE TABLE [DH_OrderGoodsInfo] (
    [id] int NOT NULL,
    [storeId] int,
    [dateId] int,
    [cateId] int,
    [cateName] varchar(150),
    [goodsName] varchar(150),
    [number] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [goodsId] int,
    [isConfirmInventory] int,
    [goodsNo] varchar(50),
    [goodsSpec] varchar(150),
    [goodsUnit] varchar(150),
    PRIMARY KEY ([id])
);

-- 表: DH_Orders
CREATE TABLE [DH_Orders] (
    [id] int NOT NULL,
    [storeId] int,
    [storeName] varchar(50),
    [payWay] int,
    [orderNo] varchar(50),
    [openId] varchar(50),
    [total] decimal(18,2),
    [payState] int,
    [refundMoney] decimal(18,2),
    [refundTime] varchar(50),
    [transaction_id] varchar(150),
    [success_time] varchar(50),
    [recordId] varchar(50),
    [recordTime] varchar(50),
    [deliverType] varchar(50),
    [deliverName] varchar(150),
    [deliverTel] varchar(150),
    [deliverAddress] varchar(550),
    [orderRemarks] varchar(1550),
    [sendNo] varchar(550),
    [sendExpress] varchar(150),
    [delflag] int,
    [orderKey] varchar(50),
    [delState] varchar(50),
    [tel] varchar(50),
    [couponUserId] int,
    [couponAmount] decimal(18,2),
    [completeTime] varchar(50),
    [sendTime] varchar(50),
    [printTime] varchar(50),
    [isPrint] int,
    [dayNumber] int,
    [orderValue] decimal(18,2),
    [prepay_id] varchar(500),
    [appId] varchar(50),
    [carNumber] varchar(255),
    [carTel] varchar(255),
    [deliverShopId] int,
    [deliverShopName] varchar(255),
    [sendRemarks] varchar(1200),
    [delTime] varchar(255),
    [CancelUserId] int,
    [CancelTime] varchar(255),
    [ConfirmUserId] int,
    [ConfirmTime] varchar(255),
    [ConfirmPath] varchar(500),
    [OrderPath] varchar(500),
    [OrderPathTime] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: DH_Refund
CREATE TABLE [DH_Refund] (
    [id] int NOT NULL,
    [refund_id] varchar(150),
    [out_refund_no] varchar(150),
    [transaction_id] varchar(150),
    [out_trade_no] varchar(150),
    [OrderGoodsId] int,
    [OrderGoodsNumber] int,
    [channel] varchar(150),
    [user_received_account] varchar(150),
    [success_time] varchar(50),
    [create_time] varchar(50),
    [refund_status] varchar(50),
    [total] decimal(18,2),
    [refund] decimal(18,2),
    [payer_total] decimal(18,2),
    [payer_refund] decimal(18,2),
    [settlement_refund] decimal(18,2),
    [settlement_total] decimal(18,2),
    [discount_refund] decimal(18,2),
    [refund_fee] decimal(18,2),
    [event_type] varchar(50),
    [summary] varchar(50),
    [refundScore] int,
    [delflag] int,
    [recordTime] varchar(50),
    [recordId] int,
    [orderId] int,
    [openId] varchar(150),
    PRIMARY KEY ([id])
);

-- 表: DH_StocktakingDate
CREATE TABLE [DH_StocktakingDate] (
    [id] int NOT NULL,
    [stocktakingDate] varchar(50),
    [storeId] int,
    [remarks] varchar(350),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [isComplete] int,
    [pdr] int,
    [pdsj] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: DH_StocktakingDetails
CREATE TABLE [DH_StocktakingDetails] (
    [id] int NOT NULL,
    [storeId] int,
    [dateId] int,
    [cateId] int,
    [inventoryGoodsId] int,
    [goodsName] varchar(450),
    [oldNumber] int,
    [newNumber] int,
    [isComplete] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [zhxgr] int,
    [zhxgsj] varchar(50),
    [remarks] varchar(2000),
    [goodsNo] varchar(50),
    [goodsSpec] varchar(150),
    [goodsUnit] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: DH_Store
CREATE TABLE [DH_Store] (
    [id] int NOT NULL,
    [storeName] varchar(50),
    [province] varchar(50),
    [city] varchar(50),
    [district] varchar(50),
    [name] varchar(50),
    [tel] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: DH_UserStore
CREATE TABLE [DH_UserStore] (
    [id] int NOT NULL,
    [userId] int,
    [storeId] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: Enterprise
CREATE TABLE [Enterprise] (
    [id] int NOT NULL,
    [enterPriseName] varchar(100),
    [fzr] varchar(50),
    [fzrlxdh] varchar(50),
    [remarks] varchar(2000),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: EzvizApp
CREATE TABLE [EzvizApp] (
    [id] int NOT NULL,
    [appKey] varchar(150),
    [appSecret] varchar(150),
    [appName] varchar(200),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [msg] varchar(150),
    PRIMARY KEY ([id])
);

-- 表: EzvizCapture
CREATE TABLE [EzvizCapture] (
    [id] int NOT NULL,
    [shopId] int,
    [shopName] varchar(50),
    [deviceName] varchar(150),
    [captureUrl] varchar(500),
    [captureTime] varchar(50),
    [recordTime] varchar(50),
    [reocrdId] int,
    [delflag] int,
    [deviceId] int,
    PRIMARY KEY ([id])
);

-- 表: EzvizDevice
CREATE TABLE [EzvizDevice] (
    [id] int NOT NULL,
    [ezvizAppId] int,
    [shopId] int,
    [showName] varchar(150),
    [deviceSerial] varchar(150),
    [verificationCode] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [city] varchar(255),
    [cityCode] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: EzvizToken
CREATE TABLE [EzvizToken] (
    [id] int NOT NULL,
    [ezvizAppId] int,
    [accessToken] varchar(350),
    [expireTime] varchar(50),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
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

-- 表: Goods
CREATE TABLE [Goods] (
    [id] int NOT NULL,
    [categoryId] int,
    [goodsName] varchar(350),
    [goodsText] varchar(350),
    [goodsImg] varchar(1150),
    [isSale] int,
    [isHot] int,
    [isRecom] int,
    [goodsSort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [shopId] int,
    [marktPrice] decimal(18,2),
    [salePrice] decimal(18,2),
    [goodsStock] int,
    [mustSelectNum] int,
    [isPackage] int,
    [IsSubMaterial] int,
    [isXcx] int,
    [groupPurchase] int,
    [isNewProduct] int,
    [imgName] varchar(150),
    [imgPath] varchar(255),
    [storeId] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsCategoryStore
CREATE TABLE [GoodsCategoryStore] (
    [id] int NOT NULL,
    [catName] varchar(150),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [catSort] int,
    [catSortXcx] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsDetails
CREATE TABLE [GoodsDetails] (
    [id] int NOT NULL,
    [goodsId] int,
    [inventoryGoodsId] int,
    [number] int,
    [shopId] int,
    [delflag] int,
    [recordTime] varchar(50),
    [recordId] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsDetailsStore
CREATE TABLE [GoodsDetailsStore] (
    [id] int NOT NULL,
    [goodsId] int,
    [inventoryGoodsId] int,
    [number] int,
    [delflag] int,
    [recordTime] varchar(50),
    [recordId] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsExchange
CREATE TABLE [GoodsExchange] (
    [id] int NOT NULL,
    [shopId] int,
    [goodsId] int,
    [price] decimal(18,2),
    [isSale] int,
    [sort] int,
    [startTime] varchar(50),
    [endTime] varchar(50),
    [limitNum] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [fullMinus] decimal(18,2),
    PRIMARY KEY ([id])
);

-- 表: GoodsSpecs
CREATE TABLE [GoodsSpecs] (
    [id] int NOT NULL,
    [goodsId] int,
    [specStock] int,
    [isDefault] int,
    [isSale] int,
    [specSort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [isSelect] int,
    [type] int,
    [isSelectNum] int,
    [parentId] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsSpecsStore
CREATE TABLE [GoodsSpecsStore] (
    [id] int NOT NULL,
    [goodsId] int,
    [specStock] int,
    [isDefault] int,
    [isSale] int,
    [specSort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [isSelect] int,
    [type] int,
    [isSelectNum] int,
    [parentId] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsStore
CREATE TABLE [GoodsStore] (
    [id] int NOT NULL,
    [categoryId] int,
    [goodsName] varchar(350),
    [goodsText] varchar(350),
    [goodsImg] varchar(1150),
    [isSale] int,
    [isHot] int,
    [isRecom] int,
    [goodsSort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [marktPrice] decimal(18,2),
    [salePrice] decimal(18,2),
    [goodsStock] int,
    [mustSelectNum] int,
    [isPackage] int,
    [IsSubMaterial] int,
    [isXcx] int,
    [groupPurchase] int,
    [isNewProduct] int,
    [imgName] varchar(150),
    [imgPath] varchar(255),
    [notes] varchar(500),
    PRIMARY KEY ([id])
);

-- 表: GoodsTransfer
CREATE TABLE [GoodsTransfer] (
    [id] int NOT NULL,
    [outShopId] int,
    [addShopId] varchar(255),
    [title] varchar(255),
    [remarks] varchar(1000),
    [time] varchar(255),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: GoodsTransferRecord
CREATE TABLE [GoodsTransferRecord] (
    [id] int NOT NULL,
    [goodsTransferId] int,
    [inventoryGoodsName] varchar(500),
    [number] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [outShopId] int,
    [addShopId] int,
    PRIMARY KEY ([id])
);

-- 表: InventoryChange
CREATE TABLE [InventoryChange] (
    [id] int NOT NULL,
    [type] int,
    [InventoryGoodsId] int,
    [orderId] int,
    [orderNo] varchar(150),
    [number] int,
    [isAdd] int,
    [recordId] int,
    [recordTime] varchar(50),
    [shopId] int,
    [remarks] varchar(450),
    PRIMARY KEY ([id])
);

-- 表: InventoryDate
CREATE TABLE [InventoryDate] (
    [id] int NOT NULL,
    [dateName] varchar(50),
    [dateRemarks] varchar(2250),
    [recoredId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: InventoryGoods
CREATE TABLE [InventoryGoods] (
    [id] int NOT NULL,
    [shopId] int,
    [goodsName] varchar(150),
    [goodsNumber] int,
    [costPrice] decimal(18,2),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [templateId] int,
    [isConfirmInventory] int,
    [alarmNumber] int,
    [dh_goodsId] int,
    [storeId] int,
    [note] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: InventoryGoodsStore
CREATE TABLE [InventoryGoodsStore] (
    [id] int NOT NULL,
    [goodsName] varchar(150),
    [goodsNumber] int,
    [costPrice] decimal(18,2),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [templateId] int,
    [isConfirmInventory] int,
    [alarmNumber] int,
    [dh_goodsId] int,
    [note] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: InventoryShop
CREATE TABLE [InventoryShop] (
    [id] int NOT NULL,
    [shopId] int,
    [dateId] int,
    [goodsName] varchar(350),
    [oldNumber] int,
    [newNumber] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [isConfirm] int,
    [InventoryGoodsId] int,
    [remarks] varchar(4000),
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

-- 表: Merchant
CREATE TABLE [Merchant] (
    [Id] int NOT NULL,
    [merchantId] varchar(255),
    [merchantName] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    PRIMARY KEY ([Id])
);

-- 表: Notice
CREATE TABLE [Notice] (
    [id] int NOT NULL,
    [title] varchar(255),
    [imgUrl] varchar(255),
    [isShow] int,
    [startTime] varchar(50),
    [endTime] varchar(50),
    [recordTime] varchar(50),
    [delflag] int,
    [href] varchar(50),
    [sort] int,
    [content] varchar(1000),
    PRIMARY KEY ([id])
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

-- 表: OrderGoodsCategory
CREATE TABLE [OrderGoodsCategory] (
    [id] int NOT NULL,
    [cateName] varchar(150),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [sort] int,
    PRIMARY KEY ([id])
);

-- 表: OrderGoodsDate
CREATE TABLE [OrderGoodsDate] (
    [id] int NOT NULL,
    [orderGoodsName] varchar(150),
    [orderGoodsDate] varchar(50),
    [orderGoodsReamrks] varchar(2050),
    [shopId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: OrderGoodsInfo
CREATE TABLE [OrderGoodsInfo] (
    [id] int NOT NULL,
    [shopId] int,
    [dateId] int,
    [cateId] int,
    [cateName] varchar(150),
    [goodsName] varchar(150),
    [specName] varchar(50),
    [boxCapacity] varchar(150),
    [storage] varchar(150),
    [unit] varchar(50),
    [price] decimal(18,2),
    [number] decimal(18,2),
    [total] decimal(18,2),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [specNumber] int,
    [totalNumber] int,
    [isInventory] int,
    [isConfirmInventory] int,
    [tempId] int,
    PRIMARY KEY ([id])
);

-- 表: OrderGoodsSpec
CREATE TABLE [OrderGoodsSpec] (
    [id] bigint NOT NULL,
    [specId] int,
    [specName] varchar(300),
    [specPrice] decimal(18,2),
    [specNumber] int,
    [specTotal] decimal(18,2),
    [orderId] bigint,
    [orderGoodsId] bigint,
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

-- 表: OrderGoodsTemplate
CREATE TABLE [OrderGoodsTemplate] (
    [id] int NOT NULL,
    [cateId] int,
    [goodsName] varchar(150),
    [specName] varchar(150),
    [boxCapacity] varchar(150),
    [storage] varchar(150),
    [unit] varchar(50),
    [price] decimal(18,2),
    [sort] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [specNumber] int,
    [isInventory] int,
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
    [isUpdate] int,
    PRIMARY KEY ([id])
);

-- 表: OtherRolls
CREATE TABLE [OtherRolls] (
    [id] int NOT NULL,
    [shopId] int,
    [typeName] varchar(50),
    [rollsValue] decimal(18,2),
    [payAmount] decimal(18,2),
    [realIncomeAmount] decimal(18,2),
    [sort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: PayMode
CREATE TABLE [PayMode] (
    [id] int NOT NULL,
    [payName] varchar(50),
    [delflag] int,
    [payNameSub] varchar(50),
    [sort] int,
    PRIMARY KEY ([id])
);

-- 表: Refund
CREATE TABLE [Refund] (
    [id] int NOT NULL,
    [refund_id] varchar(150),
    [out_refund_no] varchar(150),
    [transaction_id] varchar(150),
    [out_trade_no] varchar(150),
    [OrderGoodsId] int,
    [OrderGoodsNumber] int,
    [channel] varchar(150),
    [user_received_account] varchar(150),
    [success_time] varchar(50),
    [create_time] varchar(50),
    [refund_status] varchar(50),
    [total] decimal(18,2),
    [refund] decimal(18,2),
    [payer_total] decimal(18,2),
    [payer_refund] decimal(18,2),
    [settlement_refund] decimal(18,2),
    [settlement_total] decimal(18,2),
    [discount_refund] decimal(18,2),
    [refund_fee] decimal(18,2),
    [event_type] varchar(50),
    [summary] varchar(50),
    [refundScore] int,
    [delflag] int,
    [recordTime] varchar(50),
    [recordId] int,
    [orderId] int,
    [openId] varchar(150),
    PRIMARY KEY ([id])
);

-- 表: rg_Shop
CREATE TABLE [rg_Shop] (
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
    [isClose] int,
    PRIMARY KEY ([Id])
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

-- 表: SalesPromotion
CREATE TABLE [SalesPromotion] (
    [id] int NOT NULL,
    [promName] varchar(150),
    [startDate] varchar(50),
    [endDate] varchar(50),
    [week] varchar(50),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [typeId] int,
    [typeName] varchar(50),
    [weight] int,
    PRIMARY KEY ([id])
);

-- 表: SalesPromotionDetails
CREATE TABLE [SalesPromotionDetails] (
    [id] int NOT NULL,
    [spId] int,
    [cateId] int,
    [cateName] varchar(150),
    [goodsId] int,
    [goodsName] varchar(150),
    [goodsNum] int,
    [exchangeCateId] int,
    [exchangeCateName] varchar(150),
    [exchangeGoodsId] int,
    [exchangeName] varchar(150),
    [exchangePrice] decimal(18,2),
    [exchangeNum] int,
    [discount] decimal(18,2),
    [total] decimal(18,2),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: SalesPromotionShop
CREATE TABLE [SalesPromotionShop] (
    [id] int NOT NULL,
    [spId] int,
    [shopId] int,
    [shopName] varchar(350),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [typeId] int,
    PRIMARY KEY ([id])
);

-- 表: SalesPromotionShopPos
CREATE TABLE [SalesPromotionShopPos] (
    [id] int NOT NULL,
    [spId] int,
    [shopId] int,
    [shopName] varchar(350),
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [typeId] int,
    PRIMARY KEY ([id])
);

-- 表: Score
CREATE TABLE [Score] (
    [id] int NOT NULL,
    [userId] int,
    [userScore] int,
    PRIMARY KEY ([id])
);

-- 表: Shop
CREATE TABLE [Shop] (
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
    [province] varchar(255),
    [city] varchar(255),
    [district] varchar(255),
    [morningTime] nvarchar(255),
    [nightTime] varchar(255),
    [passengerFlow] varchar(255),
    [interval] int,
    [isClose] int,
    [enterPriseId] int,
    [merchantId] varchar(255),
    [meituanId] varchar(50),
    [elemeId] varchar(50),
    [douyinId] varchar(50),
    [establishTime] varchar(255),
    [meituantuangouId] varchar(50),
    [openingTime] varchar(255),
    [isSettlement] int,
    [settlementRate] decimal(18,3),
    [rent] varchar(50),
    [morningTime1] varchar(50),
    [nightTime1] varchar(50),
    [morningTime2] varchar(50),
    [nightTime2] varchar(50),
    [posImg] varchar(255),
    [posImgName] varchar(50),
    [IsSelf] int,
    [select] int,
    [cityCode] varchar(255),
    [imgPath] varchar(255),
    [imgName] varchar(255),
    PRIMARY KEY ([Id])
);

-- 表: ShopBankCard
CREATE TABLE [ShopBankCard] (
    [id] int NOT NULL,
    [bankName] varchar(50),
    [payeeName] varchar(50),
    [bankCard] varchar(50),
    [shopId] int,
    [delflag] int,
    [recordTime] varchar(50),
    [recordId] int,
    PRIMARY KEY ([id])
);

-- 表: ShopBusinessHours
CREATE TABLE [ShopBusinessHours] (
    [id] int NOT NULL,
    [shopId] int,
    [weeks] nvarchar(255),
    [sort] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int DEFAULT ((0)),
    [startTime1] varchar(255),
    [endTime1] varchar(255),
    [startTime2] varchar(255),
    [endTime2] varchar(255),
    [startTime3] varchar(255),
    [endTime3] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: ShopCarousel
CREATE TABLE [ShopCarousel] (
    [id] int NOT NULL,
    [shopId] int,
    [name] varchar(500),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [sort] int,
    [img] varchar(500),
    [href] varchar(255),
    [goodsId] int,
    [isShow] int,
    [filePath] varchar(500),
    [fileName] varchar(255),
    PRIMARY KEY ([id])
);

-- 表: ShopFlow
CREATE TABLE [ShopFlow] (
    [id] int NOT NULL,
    [shopId] int,
    [startTime] nvarchar(255),
    [endTime] varchar(255),
    [num] int,
    [remarks] varchar(1000),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
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
    [state] int,
    PRIMARY KEY ([id])
);

-- 表: ShoppingCart
CREATE TABLE [ShoppingCart] (
    [id] int NOT NULL,
    [userId] int,
    [categoryId] int,
    [goodsId] int,
    [goodsNumber] int,
    [recordTime] varchar(50),
    [lastTime] varchar(50),
    [delflag] int,
    [shopId] int,
    PRIMARY KEY ([id])
);

-- 表: ShoppingCartSpec
CREATE TABLE [ShoppingCartSpec] (
    [id] int NOT NULL,
    [cartId] int,
    [specId] int,
    [specNumber] int,
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    PRIMARY KEY ([id])
);

-- 表: SocketMessage
CREATE TABLE [SocketMessage] (
    [id] int NOT NULL,
    [orderId] int,
    [clientUserId] int,
    [orderNo] varchar(150),
    [orderKey] varchar(150),
    [MessageState] int,
    [recordTime] varchar(50),
    [sendTime] varchar(50),
    [receiveTime] varchar(50),
    [shopId] int,
    [delflag] int,
    [orderTel] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: StocktakingDate
CREATE TABLE [StocktakingDate] (
    [id] int NOT NULL,
    [stocktakingDate] varchar(50),
    [shopId] int,
    [remarks] varchar(350),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [isComplete] int,
    [pdr] int,
    [pdsj] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: StocktakingDetails
CREATE TABLE [StocktakingDetails] (
    [id] int NOT NULL,
    [shopId] int,
    [dateId] int,
    [inventoryGoodsId] int,
    [goodsName] varchar(450),
    [oldNumber] int,
    [newNumber] int,
    [isComplete] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    [zhxgr] int,
    [zhxgsj] varchar(50),
    [remarks] varchar(2000),
    PRIMARY KEY ([id])
);

-- 表: TakeoutPackage
CREATE TABLE [TakeoutPackage] (
    [id] int NOT NULL,
    [packageName] varchar(350),
    [takeoutId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] nchar(400),
    [shopId] int,
    PRIMARY KEY ([id])
);

-- 表: TakeoutPackageInfo
CREATE TABLE [TakeoutPackageInfo] (
    [id] int NOT NULL,
    [packageId] int,
    [goodsNumber] int,
    [goodsId] int,
    [delflag] int,
    [recordId] int,
    [recordTime] varchar(50),
    PRIMARY KEY ([id])
);

-- 表: TakeoutType
CREATE TABLE [TakeoutType] (
    [id] int NOT NULL,
    [checkoutName] varchar(150),
    [recordId] int,
    [recordTime] varchar(50),
    [delflag] int,
    [sort] int,
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

-- 表: TyTable
CREATE TABLE [TyTable] (
    [Id] bigint NOT NULL,
    [Mc] varchar(100),
    [PageType] varchar(255),
    [RecordTime] varchar(100),
    [RecordId] int,
    [Bz] nvarchar(MAX),
    [bm] varchar(50),
    [Delflag] int DEFAULT ((0)),
    PRIMARY KEY ([Id])
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
    [id] int NOT NULL,
    [openid] varchar(MAX),
    [content] varchar(MAX),
    [types] varchar(255),
    [recordTime] varchar(255),
    [delflag] int DEFAULT ((0)),
    [userId] int,
    [logId] int DEFAULT ((0)),
    [pageName] varchar(500),
    [dwId] int,
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
    [ID] int NOT NULL,
    [Xm] varchar(100),
    [Sfz] varchar(255),
    [Sex] varchar(255),
    [Tel] varchar(255),
    [OpenId] varchar(255),
    [State] varchar(255),
    [NickName] varchar(255),
    [Headimgurl] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [Zcsj] varchar(255),
    [RecordTime] varchar(255),
    [GzhOpenId] varchar(255),
    [ShopId] int,
    [UserScore] int,
    [ExtensionId] int,
    [ExtensionTime] varchar(255),
    [Power] int,
    [shopPower] varchar(255),
    [isCoupon] int,
    [XcxIsEnter] int,
    [isPush] int,
    [anchorfakeid] varchar(255),
    [isManager] int,
    [DH_NavIds] varchar(500),
    [Dh_StoreId] int,
    [Dh_isPush] int,
    [Dh_StoreIds] varchar(1000),
    [Dh_role] int,
    [cityCode] varchar(255),
    [city] varchar(255),
    [Remarks] varchar(1000),
    PRIMARY KEY ([ID])
);

-- 表: XcxUser11
CREATE TABLE [XcxUser11] (
    [ID] int NOT NULL,
    [Xm] varchar(100),
    [Sfz] varchar(255),
    [Sex] varchar(255),
    [Tel] varchar(255),
    [OpenId] varchar(255),
    [State] varchar(255),
    [NickName] varchar(255),
    [Headimgurl] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [Zcsj] varchar(255),
    [RecordTime] varchar(255),
    [gzhOpenId] varchar(255),
    [shopId] int,
    [userScore] int,
    PRIMARY KEY ([ID])
);

-- 表: XcxUserAddress
CREATE TABLE [XcxUserAddress] (
    [Id] int NOT NULL,
    [Name] varchar(50),
    [Tel] varchar(1000),
    [Province] varchar(500),
    [City] varchar(500),
    [District] varchar(500),
    [Delflag] int DEFAULT ((0)),
    [RecordId] int,
    [RecordTime] varchar(50),
    [AddressInfo] varchar(500),
    [Address] varchar(255),
    [IsDefault] int,
    [Latitude] varchar(255),
    [Longitude] varchar(255),
    [sex] varchar(255),
    [shopId] int,
    PRIMARY KEY ([Id])
);

-- 表: XcxUserDisable
CREATE TABLE [XcxUserDisable] (
    [Id] int NOT NULL,
    [OpenId] varchar(255),
    [RecordId] int,
    [Delflag] bit DEFAULT ((0)),
    [RecordTime] varchar(255),
    PRIMARY KEY ([Id])
);

