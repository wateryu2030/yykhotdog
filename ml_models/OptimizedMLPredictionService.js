
// 基于优化模型的预测API
const optimizedModels = require('./ml_models/models.json');
const modelPerformance = require('./ml_models/model_performance.json');

class OptimizedMLPredictionService {
    static predictRevenue(features) {
        const model = optimizedModels.revenue;
        const score = this.calculateScore(features);
        return model.intercept + model.coefficient * score;
    }
    
    static calculateScore(features) {
        const weights = optimizedModels.score.weights;
        return (
            features.poiDensity * weights.poi_density_score +
            features.trafficScore * weights.traffic_score +
            features.populationDensity * weights.population_score +
            features.competitionLevel * weights.competition_score +
            features.rentalCost * weights.rental_cost_score
        );
    }
    
    static predictConfidence(features) {
        const model = optimizedModels.confidence;
        const score = this.calculateScore(features);
        return Math.min(0.95, Math.max(0.6, 
            model.base_confidence + model.score_factor * (score / 100)
        ));
    }
    
    static predictRiskLevel(features) {
        const model = optimizedModels.risk;
        const score = this.calculateScore(features);
        
        if (score >= model.thresholds.low) return 'low';
        if (score >= model.thresholds.medium) return 'medium';
        return 'high';
    }
    
    static getModelPerformance() {
        return modelPerformance;
    }
}

module.exports = OptimizedMLPredictionService;
