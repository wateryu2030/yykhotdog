import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// 选址状态枚举
export enum SiteSelectionStatus {
  PENDING = 'pending',
  INVESTIGATED = 'investigated',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// 选址记录属性接口
export interface SiteSelectionAttributes {
  id: number;
  location_name: string;
  province: string;
  city: string;
  district: string;
  address: string;
  longitude: number;
  latitude: number;
  score?: number;
  poi_density_score?: number;
  traffic_score?: number;
  population_score?: number;
  competition_score?: number;
  status: SiteSelectionStatus;
  investigator_id?: number;
  investigation_notes?: string;
  created_at: Date;
  updated_at: Date;
}

// 创建选址记录时的可选属性
export interface SiteSelectionCreationAttributes extends Optional<SiteSelectionAttributes, 'id' | 'created_at' | 'updated_at'> {}

// 选址记录模型类
export class SiteSelection extends Model<SiteSelectionAttributes, SiteSelectionCreationAttributes> implements SiteSelectionAttributes {
  public id!: number;
  public location_name!: string;
  public province!: string;
  public city!: string;
  public district!: string;
  public address!: string;
  public longitude!: number;
  public latitude!: number;
  public score?: number;
  public poi_density_score?: number;
  public traffic_score?: number;
  public population_score?: number;
  public competition_score?: number;
  public status!: SiteSelectionStatus;
  public investigator_id?: number;
  public investigation_notes?: string;
  public created_at!: Date;
  public updated_at!: Date;

  // 时间戳
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// 定义选址记录模型
SiteSelection.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    location_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    province: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    district: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: false,
    },
    score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    poi_density_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    traffic_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    population_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    competition_score: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    investigator_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    investigation_notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'site_selections',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        name: 'idx_location',
        fields: ['province', 'city', 'district'],
      },
      {
        name: 'idx_score',
        fields: ['score'],
      },
      {
        name: 'idx_status',
        fields: ['status'],
      },
    ],
  }
);

export default SiteSelection; 