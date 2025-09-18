// Active learning feedback system for continuous model improvement
import type { TransactionData, BiometricData } from "./types"
import type { FraudDetectionResponse } from "./fraud-detection-client"

export interface FeedbackData {
  transactionId: string
  actualLabel: "fraud" | "legitimate" | "unknown"
  confidence: number
  reviewerId: string
  reviewTimestamp: Date
  notes?: string
  evidenceType: "manual_review" | "customer_dispute" | "bank_confirmation" | "automated_verification"
}

export interface ModelUpdateRequest {
  feedbackBatch: FeedbackData[]
  updateType: "incremental" | "full_retrain"
  priority: "low" | "medium" | "high"
  scheduledTime?: Date
}

export interface ActiveLearningQuery {
  transactionId: string
  uncertaintyScore: number
  diversityScore: number
  importanceScore: number
  queryReason: string[]
  suggestedReviewers: string[]
}

export interface ModelPerformanceMetrics {
  accuracy: number
  precision: number
  recall: number
  f1Score: number
  falsePositiveRate: number
  falseNegativeRate: number
  auc: number
  lastUpdated: Date
  sampleSize: number
}

export class FeedbackSystem {
  private feedbackHistory: Map<string, FeedbackData> = new Map()
  private pendingReviews: Map<string, ActiveLearningQuery> = new Map()
  private modelPerformance: ModelPerformanceMetrics = {
    accuracy: 0.92,
    precision: 0.89,
    recall: 0.94,
    f1Score: 0.91,
    falsePositiveRate: 0.08,
    falseNegativeRate: 0.06,
    auc: 0.96,
    lastUpdated: new Date(),
    sampleSize: 1000,
  }
  private updateQueue: ModelUpdateRequest[] = []
  private reviewerWorkload: Map<string, number> = new Map()

  constructor() {
    this.initializeReviewers()
    this.startPeriodicUpdates()
  }

  private initializeReviewers() {
    // Initialize reviewer workload tracking
    const reviewers = ["analyst_001", "analyst_002", "analyst_003", "senior_analyst_001", "ml_engineer_001"]
    reviewers.forEach((reviewer) => {
      this.reviewerWorkload.set(reviewer, 0)
    })
  }

  private startPeriodicUpdates() {
    // Simulate periodic model updates every 30 seconds
    setInterval(() => {
      this.processUpdateQueue()
      this.updateModelPerformance()
    }, 30000)
  }

  // Submit feedback for a transaction
  async submitFeedback(feedback: FeedbackData): Promise<void> {
    // Validate feedback
    if (!feedback.transactionId || !feedback.actualLabel || !feedback.reviewerId) {
      throw new Error("Invalid feedback data: missing required fields")
    }

    // Store feedback
    this.feedbackHistory.set(feedback.transactionId, feedback)

    // Remove from pending reviews if it exists
    this.pendingReviews.delete(feedback.transactionId)

    // Update reviewer workload
    const currentWorkload = this.reviewerWorkload.get(feedback.reviewerId) || 0
    this.reviewerWorkload.set(feedback.reviewerId, currentWorkload + 1)

    // Determine if immediate model update is needed
    const shouldTriggerUpdate = this.shouldTriggerImmediateUpdate(feedback)

    if (shouldTriggerUpdate) {
      await this.queueModelUpdate([feedback], "incremental", "high")
    }

    console.log(`[v0] Feedback submitted for transaction ${feedback.transactionId}: ${feedback.actualLabel}`)
  }

  // Active learning: identify transactions that need human review
  async identifyUncertainTransactions(
    predictions: FraudDetectionResponse[],
    transactions: TransactionData[],
    biometrics: BiometricData[],
  ): Promise<ActiveLearningQuery[]> {
    const queries: ActiveLearningQuery[] = []

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i]
      const transaction = transactions[i]
      const biometric = biometrics[i]

      // Skip if already has feedback
      if (this.feedbackHistory.has(prediction.transactionId)) {
        continue
      }

      // Calculate uncertainty score
      const uncertaintyScore = this.calculateUncertaintyScore(prediction)

      // Calculate diversity score (how different this transaction is from previous ones)
      const diversityScore = this.calculateDiversityScore(transaction, biometric)

      // Calculate importance score (business impact)
      const importanceScore = this.calculateImportanceScore(transaction, prediction)

      // Combined score for active learning
      const combinedScore = uncertaintyScore * 0.4 + diversityScore * 0.3 + importanceScore * 0.3

      // Threshold for requiring human review
      if (combinedScore > 0.6) {
        const queryReasons = this.generateQueryReasons(prediction, transaction, uncertaintyScore, diversityScore)
        const suggestedReviewers = this.suggestReviewers(prediction, transaction)

        const query: ActiveLearningQuery = {
          transactionId: prediction.transactionId,
          uncertaintyScore,
          diversityScore,
          importanceScore,
          queryReason: queryReasons,
          suggestedReviewers,
        }

        queries.push(query)
        this.pendingReviews.set(prediction.transactionId, query)
      }
    }

    // Sort by combined score (highest first)
    queries.sort((a, b) => {
      const scoreA = a.uncertaintyScore * 0.4 + a.diversityScore * 0.3 + a.importanceScore * 0.3
      const scoreB = b.uncertaintyScore * 0.4 + b.diversityScore * 0.3 + b.importanceScore * 0.3
      return scoreB - scoreA
    })

    console.log(`[v0] Identified ${queries.length} transactions for human review`)
    return queries.slice(0, 10) // Limit to top 10 for review capacity
  }

  private calculateUncertaintyScore(prediction: FraudDetectionResponse): number {
    // High uncertainty when probability is close to 0.5
    const distanceFromMiddle = Math.abs(prediction.fraudProbability - 0.5)
    const uncertaintyScore = 1 - distanceFromMiddle * 2

    // Also consider low confidence as high uncertainty
    const confidenceUncertainty = 1 - prediction.confidence

    return Math.max(uncertaintyScore, confidenceUncertainty)
  }

  private calculateDiversityScore(transaction: TransactionData, biometric: BiometricData): number {
    // Simple diversity calculation based on transaction features
    // In production, this would use more sophisticated clustering/similarity measures

    const recentTransactions = Array.from(this.feedbackHistory.values())
      .slice(-100)
      .map((f) => f.transactionId)

    // If we have few examples, diversity is high
    if (recentTransactions.length < 10) {
      return 0.8
    }

    // Simplified diversity based on amount, merchant category, and time
    const hour = transaction.timestamp.getHours()
    const isUnusualTime = hour < 6 || hour > 22
    const isHighAmount = transaction.amount > 1000
    const isUnusualMerchant = transaction.merchant.category === "atm"

    let diversityScore = 0.3 // Base diversity
    if (isUnusualTime) diversityScore += 0.2
    if (isHighAmount) diversityScore += 0.3
    if (isUnusualMerchant) diversityScore += 0.2

    return Math.min(1, diversityScore)
  }

  private calculateImportanceScore(transaction: TransactionData, prediction: FraudDetectionResponse): number {
    let importanceScore = 0

    // High-value transactions are more important
    if (transaction.amount > 5000) importanceScore += 0.4
    else if (transaction.amount > 1000) importanceScore += 0.2

    // High-risk predictions are more important to verify
    if (prediction.riskLevel === "high") importanceScore += 0.3
    else if (prediction.riskLevel === "medium") importanceScore += 0.1

    // Transactions with many explanations are more complex
    if (prediction.explanation.length > 2) importanceScore += 0.2

    // Business-critical merchants
    if (["bank", "atm", "financial"].includes(transaction.merchant.category)) {
      importanceScore += 0.1
    }

    return Math.min(1, importanceScore)
  }

  private generateQueryReasons(
    prediction: FraudDetectionResponse,
    transaction: TransactionData,
    uncertaintyScore: number,
    diversityScore: number,
  ): string[] {
    const reasons: string[] = []

    if (uncertaintyScore > 0.7) {
      reasons.push("Model uncertainty: prediction confidence is low")
    }

    if (Math.abs(prediction.fraudProbability - 0.5) < 0.1) {
      reasons.push("Borderline case: fraud probability near decision threshold")
    }

    if (diversityScore > 0.6) {
      reasons.push("Novel transaction pattern: different from training data")
    }

    if (transaction.amount > 5000) {
      reasons.push("High-value transaction: requires manual verification")
    }

    if (prediction.explanation.length > 3) {
      reasons.push("Complex case: multiple risk factors identified")
    }

    if (prediction.biometricAnomalies > 2) {
      reasons.push("Behavioral anomalies: unusual user interaction patterns")
    }

    return reasons
  }

  private suggestReviewers(prediction: FraudDetectionResponse, transaction: TransactionData): string[] {
    const reviewers: string[] = []

    // Load balancing: suggest reviewers with lowest workload
    const sortedReviewers = Array.from(this.reviewerWorkload.entries()).sort((a, b) => a[1] - b[1])

    // High-risk cases go to senior analysts
    if (prediction.riskLevel === "high" || transaction.amount > 10000) {
      reviewers.push("senior_analyst_001")
    }

    // Complex biometric cases go to ML engineers
    if (prediction.biometricAnomalies > 2) {
      reviewers.push("ml_engineer_001")
    }

    // Add general analysts based on workload
    reviewers.push(...sortedReviewers.slice(0, 2).map((r) => r[0]))

    return [...new Set(reviewers)] // Remove duplicates
  }

  private shouldTriggerImmediateUpdate(feedback: FeedbackData): boolean {
    // Trigger immediate update for high-confidence corrections
    if (feedback.confidence > 0.9 && feedback.evidenceType === "bank_confirmation") {
      return true
    }

    // Trigger if we have enough feedback samples
    const recentFeedback = Array.from(this.feedbackHistory.values()).filter(
      (f) => new Date().getTime() - f.reviewTimestamp.getTime() < 3600000, // Last hour
    )

    return recentFeedback.length >= 10
  }

  private async queueModelUpdate(
    feedbackBatch: FeedbackData[],
    updateType: "incremental" | "full_retrain",
    priority: "low" | "medium" | "high",
  ): Promise<void> {
    const updateRequest: ModelUpdateRequest = {
      feedbackBatch,
      updateType,
      priority,
      scheduledTime: new Date(Date.now() + (priority === "high" ? 0 : priority === "medium" ? 300000 : 1800000)), // 0, 5min, 30min
    }

    this.updateQueue.push(updateRequest)
    this.updateQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })

    console.log(`[v0] Queued ${updateType} model update with ${feedbackBatch.length} feedback samples`)
  }

  private async processUpdateQueue(): Promise<void> {
    const now = new Date()
    const readyUpdates = this.updateQueue.filter((update) => !update.scheduledTime || update.scheduledTime <= now)

    for (const update of readyUpdates) {
      try {
        await this.executeModelUpdate(update)
        this.updateQueue = this.updateQueue.filter((u) => u !== update)
      } catch (error) {
        console.error("Model update failed:", error)
        // Reschedule for later
        update.scheduledTime = new Date(Date.now() + 600000) // 10 minutes
      }
    }
  }

  private async executeModelUpdate(update: ModelUpdateRequest): Promise<void> {
    console.log(`[v0] Executing ${update.updateType} model update with ${update.feedbackBatch.length} samples`)

    // Simulate model update process
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Update performance metrics based on feedback
    this.updateModelPerformanceFromFeedback(update.feedbackBatch)

    console.log(`[v0] Model update completed. New accuracy: ${this.modelPerformance.accuracy.toFixed(3)}`)
  }

  private updateModelPerformanceFromFeedback(feedbackBatch: FeedbackData[]): void {
    // Simulate performance improvement from feedback
    const improvementFactor = Math.min(0.02, feedbackBatch.length * 0.001)

    this.modelPerformance.accuracy = Math.min(0.99, this.modelPerformance.accuracy + improvementFactor)
    this.modelPerformance.precision = Math.min(0.99, this.modelPerformance.precision + improvementFactor * 0.8)
    this.modelPerformance.recall = Math.min(0.99, this.modelPerformance.recall + improvementFactor * 1.2)
    this.modelPerformance.f1Score =
      (2 * this.modelPerformance.precision * this.modelPerformance.recall) /
      (this.modelPerformance.precision + this.modelPerformance.recall)
    this.modelPerformance.lastUpdated = new Date()
    this.modelPerformance.sampleSize += feedbackBatch.length
  }

  private updateModelPerformance(): void {
    // Simulate gradual performance changes over time
    const randomVariation = (Math.random() - 0.5) * 0.01 // ±0.5% variation

    this.modelPerformance.accuracy = Math.max(0.85, Math.min(0.99, this.modelPerformance.accuracy + randomVariation))
    this.modelPerformance.precision = Math.max(0.8, Math.min(0.99, this.modelPerformance.precision + randomVariation))
    this.modelPerformance.recall = Math.max(0.85, Math.min(0.99, this.modelPerformance.recall + randomVariation))

    this.modelPerformance.f1Score =
      (2 * this.modelPerformance.precision * this.modelPerformance.recall) /
      (this.modelPerformance.precision + this.modelPerformance.recall)

    this.modelPerformance.falsePositiveRate = 1 - this.modelPerformance.precision
    this.modelPerformance.falseNegativeRate = 1 - this.modelPerformance.recall
  }

  // Public API methods
  async getPendingReviews(): Promise<ActiveLearningQuery[]> {
    return Array.from(this.pendingReviews.values()).sort((a, b) => {
      const scoreA = a.uncertaintyScore * 0.4 + a.diversityScore * 0.3 + a.importanceScore * 0.3
      const scoreB = b.uncertaintyScore * 0.4 + b.diversityScore * 0.3 + b.importanceScore * 0.3
      return scoreB - scoreA
    })
  }

  async getFeedbackHistory(limit = 100): Promise<FeedbackData[]> {
    return Array.from(this.feedbackHistory.values())
      .sort((a, b) => b.reviewTimestamp.getTime() - a.reviewTimestamp.getTime())
      .slice(0, limit)
  }

  async getModelPerformance(): Promise<ModelPerformanceMetrics> {
    return { ...this.modelPerformance }
  }

  async getReviewerWorkload(): Promise<Map<string, number>> {
    return new Map(this.reviewerWorkload)
  }

  async getUpdateQueueStatus(): Promise<{
    pending: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
  }> {
    return {
      pending: this.updateQueue.length,
      highPriority: this.updateQueue.filter((u) => u.priority === "high").length,
      mediumPriority: this.updateQueue.filter((u) => u.priority === "medium").length,
      lowPriority: this.updateQueue.filter((u) => u.priority === "low").length,
    }
  }

  // Batch feedback submission for bulk operations
  async submitBatchFeedback(feedbackBatch: FeedbackData[]): Promise<void> {
    for (const feedback of feedbackBatch) {
      await this.submitFeedback(feedback)
    }

    // Queue batch update if significant volume
    if (feedbackBatch.length >= 5) {
      await this.queueModelUpdate(feedbackBatch, "incremental", "medium")
    }
  }

  // Generate feedback report for analysts
  async generateFeedbackReport(timeRange: { start: Date; end: Date }): Promise<{
    totalFeedback: number
    fraudConfirmed: number
    legitimateConfirmed: number
    accuracyImprovement: number
    topReviewers: { reviewer: string; count: number }[]
    commonPatterns: string[]
  }> {
    const feedbackInRange = Array.from(this.feedbackHistory.values()).filter(
      (f) => f.reviewTimestamp >= timeRange.start && f.reviewTimestamp <= timeRange.end,
    )

    const fraudConfirmed = feedbackInRange.filter((f) => f.actualLabel === "fraud").length
    const legitimateConfirmed = feedbackInRange.filter((f) => f.actualLabel === "legitimate").length

    const reviewerCounts = new Map<string, number>()
    feedbackInRange.forEach((f) => {
      reviewerCounts.set(f.reviewerId, (reviewerCounts.get(f.reviewerId) || 0) + 1)
    })

    const topReviewers = Array.from(reviewerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reviewer, count]) => ({ reviewer, count }))

    return {
      totalFeedback: feedbackInRange.length,
      fraudConfirmed,
      legitimateConfirmed,
      accuracyImprovement: 0.02, // Simulated improvement
      topReviewers,
      commonPatterns: [
        "High-value transactions flagged incorrectly",
        "ATM withdrawals with legitimate explanations",
        "New user behavior patterns",
        "Cross-border transactions",
      ],
    }
  }
}
