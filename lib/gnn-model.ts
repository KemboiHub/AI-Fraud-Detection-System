// Graph Neural Network model for fraud detection
import type { GraphNode, GraphEdge, TransactionData, BiometricData } from "./types" // Assuming these types are declared in a separate file

export interface GNNEmbedding {
  nodeId: string
  embedding: number[]
  timestamp: Date
}

export interface FraudPrediction {
  transactionId: string
  fraudProbability: number
  riskLevel: "low" | "medium" | "high"
  explanation: string[]
  confidence: number
}

// Simplified GNN implementation (in production, this would use TensorFlow.js or similar)
export class GraphNeuralNetwork {
  private nodeEmbeddings: Map<string, number[]> = new Map()
  private weights: number[][] = []
  private isTraining = false

  constructor() {
    this.initializeWeights()
  }

  private initializeWeights() {
    // Initialize random weights for demonstration
    const embeddingSize = 64
    const hiddenSize = 32

    this.weights = [
      // Input to hidden layer
      Array.from({ length: embeddingSize * hiddenSize }, () => Math.random() * 0.1 - 0.05),
      // Hidden to output layer
      Array.from({ length: hiddenSize }, () => Math.random() * 0.1 - 0.05),
    ]
  }

  async processGraph(nodes: GraphNode[], edges: GraphEdge[]): Promise<GNNEmbedding[]> {
    const embeddings: GNNEmbedding[] = []

    // Message passing simulation
    for (const node of nodes) {
      const neighbors = this.getNeighbors(node.id, edges)
      const embedding = this.computeNodeEmbedding(node, neighbors, nodes)

      embeddings.push({
        nodeId: node.id,
        embedding,
        timestamp: new Date(),
      })

      this.nodeEmbeddings.set(node.id, embedding)
    }

    return embeddings
  }

  private getNeighbors(nodeId: string, edges: GraphEdge[]): string[] {
    return edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => (edge.source === nodeId ? edge.target : edge.source))
  }

  private computeNodeEmbedding(node: GraphNode, neighbors: string[], allNodes: GraphNode[]): number[] {
    const embeddingSize = 64
    const embedding = new Array(embeddingSize).fill(0)

    // Node features
    const nodeFeatures = this.extractNodeFeatures(node)

    // Aggregate neighbor features
    const neighborFeatures = neighbors.map((neighborId) => {
      const neighborNode = allNodes.find((n) => n.id === neighborId)
      return neighborNode ? this.extractNodeFeatures(neighborNode) : new Array(10).fill(0)
    })

    // Simple aggregation (mean pooling)
    const aggregatedFeatures = new Array(10).fill(0)
    if (neighborFeatures.length > 0) {
      for (let i = 0; i < 10; i++) {
        aggregatedFeatures[i] =
          neighborFeatures.reduce((sum, features) => sum + features[i], 0) / neighborFeatures.length
      }
    }

    // Combine node and neighbor features
    const combinedFeatures = [...nodeFeatures, ...aggregatedFeatures]

    // Apply simple transformation to get embedding
    for (let i = 0; i < embeddingSize; i++) {
      embedding[i] = Math.tanh(
        combinedFeatures.reduce(
          (sum, feature, idx) => sum + feature * (this.weights[0][i * combinedFeatures.length + idx] || 0),
          0,
        ),
      )
    }

    return embedding
  }

  private extractNodeFeatures(node: GraphNode): number[] {
    const features = new Array(10).fill(0)

    switch (node.type) {
      case "user":
        features[0] = 1 // user type indicator
        break
      case "merchant":
        features[1] = 1 // merchant type indicator
        features[2] = node.properties.category === "retail" ? 1 : 0
        features[3] = node.properties.category === "food" ? 1 : 0
        features[4] = node.properties.category === "atm" ? 1 : 0
        break
      case "device":
        features[5] = 1 // device type indicator
        break
      case "location":
        features[6] = 1 // location type indicator
        features[7] = node.properties.lat / 90 // normalized latitude
        features[8] = node.properties.lng / 180 // normalized longitude
        break
    }

    return features
  }

  async predictFraud(
    transaction: TransactionData,
    biometric: BiometricData,
    graphEmbeddings: GNNEmbedding[],
  ): Promise<FraudPrediction> {
    // Get relevant embeddings
    const userEmbedding = graphEmbeddings.find((e) => e.nodeId === transaction.userId)?.embedding || []
    const merchantEmbedding = graphEmbeddings.find((e) => e.nodeId === transaction.merchant.id)?.embedding || []
    const deviceEmbedding = graphEmbeddings.find((e) => e.nodeId === transaction.deviceId)?.embedding || []

    // Extract transaction features
    const transactionFeatures = this.extractTransactionFeatures(transaction)
    const biometricFeatures = this.extractBiometricFeatures(biometric)

    // Combine all features
    const allFeatures = [
      ...transactionFeatures,
      ...biometricFeatures,
      ...userEmbedding.slice(0, 10),
      ...merchantEmbedding.slice(0, 10),
      ...deviceEmbedding.slice(0, 10),
    ]

    // Simple fraud scoring
    const fraudScore = this.computeFraudScore(allFeatures, transaction)
    const fraudProbability = Math.max(0, Math.min(1, fraudScore))

    let riskLevel: "low" | "medium" | "high" = "low"
    if (fraudProbability > 0.7) riskLevel = "high"
    else if (fraudProbability > 0.4) riskLevel = "medium"

    const explanation = this.generateExplanation(transaction, biometric, fraudProbability)

    return {
      transactionId: transaction.id,
      fraudProbability,
      riskLevel,
      explanation,
      confidence: Math.random() * 0.3 + 0.7, // Simulated confidence
    }
  }

  private extractTransactionFeatures(transaction: TransactionData): number[] {
    return [
      Math.log(transaction.amount + 1) / 10, // log-normalized amount
      new Date().getHours() / 24, // time of day
      transaction.paymentMethod === "credit_card" ? 1 : 0,
      transaction.merchant.category === "atm" ? 1 : 0,
      transaction.merchant.category === "retail" ? 1 : 0,
    ]
  }

  private extractBiometricFeatures(biometric: BiometricData): number[] {
    const avgDwellTime =
      biometric.keystrokeDynamics.dwellTimes.reduce((a, b) => a + b, 0) / biometric.keystrokeDynamics.dwellTimes.length
    const avgVelocity =
      biometric.mouseMovements.velocity.reduce((a, b) => a + b, 0) / biometric.mouseMovements.velocity.length

    return [
      avgDwellTime / 200, // normalized dwell time
      biometric.keystrokeDynamics.typingSpeed / 100, // normalized typing speed
      avgVelocity / 1000, // normalized mouse velocity
      Math.abs(biometric.deviceSensors.accelerometer[0]), // device movement
      Math.abs(biometric.deviceSensors.gyroscope[0]) / 360, // device rotation
    ]
  }

  private computeFraudScore(features: number[], transaction: TransactionData): number {
    // Simple heuristic-based scoring for demonstration
    let score = 0

    // High amount transactions are more suspicious
    if (transaction.amount > 1000) score += 0.3
    if (transaction.amount > 5000) score += 0.4

    // Late night transactions
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) score += 0.2

    // ATM transactions with high amounts
    if (transaction.merchant.category === "atm" && transaction.amount > 500) score += 0.3

    // Add some randomness for demonstration
    score += Math.random() * 0.2

    return score
  }

  private generateExplanation(transaction: TransactionData, biometric: BiometricData, fraudProb: number): string[] {
    const explanations: string[] = []

    if (transaction.amount > 1000) {
      explanations.push(`High transaction amount: $${transaction.amount}`)
    }

    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) {
      explanations.push(`Unusual time: ${hour}:00`)
    }

    if (transaction.merchant.category === "atm" && transaction.amount > 500) {
      explanations.push(`Large ATM withdrawal: $${transaction.amount}`)
    }

    if (biometric.keystrokeDynamics.typingSpeed < 30) {
      explanations.push("Unusual typing pattern detected")
    }

    if (fraudProb > 0.5 && explanations.length === 0) {
      explanations.push("Anomalous behavioral patterns detected")
    }

    return explanations
  }
}
