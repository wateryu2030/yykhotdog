import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Shop extends Model {
  public Id!: number;
  public ShopName!: string;
  public ShopAddress!: string;
  public Director!: string;
  public DirectorPhone!: string;
  public FirstImg!: string;
  public RecordId!: number;
  public Delflag!: boolean;
  public RecordTime!: string;
  public location!: string;
  public state!: number;
  public isUse!: number;
  public blurb!: string;
  public province!: string;
  public city!: string;
  public district!: string;
  public morningTime!: string;
  public nightTime!: string;
  public passengerFlow!: string;
  public interval!: number;
  public isClose!: number;
  public enterPriseId!: number;
  public merchantId!: string;
  public meituanId!: string;
  public elemeId!: string;
  public douyinId!: string;
  public establishTime!: string;
  public meituantuangouId!: string;
  public openingTime!: string;
  public isSettlement!: number;
  public settlementRate!: number;
  public rent!: string;
  public morningTime1!: string;
  public nightTime1!: string;
  public morningTime2!: string;
  public nightTime2!: string;
  public posImg!: string;
  public posImgName!: string;
  public IsSelf!: number;
}

Shop.init(
  {
    Id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: false, // 不自增，和同步表结构一致
      field: 'Id'
    },
    ShopName: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'ShopName'
    },
    ShopAddress: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'ShopAddress'
    },
    Director: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'Director'
    },
    DirectorPhone: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'DirectorPhone'
    },
    FirstImg: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'FirstImg'
    },
    RecordId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'RecordId'
    },
    Delflag: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'Delflag'
    },
    RecordTime: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'RecordTime'
    },
    location: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'location'
    },
    state: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'state'
    },
    isUse: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'isUse'
    },
    blurb: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'blurb'
    },
    province: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'province'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'city'
    },
    district: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'district'
    },
    morningTime: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'morningTime'
    },
    nightTime: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'nightTime'
    },
    passengerFlow: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'passengerFlow'
    },
    interval: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'interval'
    },
    isClose: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'isClose'
    },
    enterPriseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'enterPriseId'
    },
    merchantId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'merchantId'
    },
    meituanId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'meituanId'
    },
    elemeId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'elemeId'
    },
    douyinId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'douyinId'
    },
    establishTime: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'establishTime'
    },
    meituantuangouId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'meituantuangouId'
    },
    openingTime: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'openingTime'
    },
    isSettlement: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'isSettlement'
    },
    settlementRate: {
      type: DataTypes.DECIMAL(18, 3),
      allowNull: true,
      field: 'settlementRate'
    },
    rent: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'rent'
    },
    morningTime1: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'morningTime1'
    },
    nightTime1: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nightTime1'
    },
    morningTime2: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'morningTime2'
    },
    nightTime2: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nightTime2'
    },
    posImg: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'posImg'
    },
    posImgName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'posImgName'
    },
    IsSelf: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'IsSelf'
    }
  },
  {
    sequelize,
    tableName: 'Shop',
    freezeTableName: true,
    timestamps: false
  }
);

export default Shop; 