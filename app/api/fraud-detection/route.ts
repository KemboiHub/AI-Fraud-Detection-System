// Real-time fraud detection API with sub-200ms response time
import { type NextRequest, NextResponse } from "next/server"
import { GraphNeuralNetwork } from "@/lib/gnn-model"
import { BiometricsProcessor } from "@/lib/biometrics-processor"
import { GraphBuilder } from "@/lib/data-ingestion"
import type { TransactionData, BiometricData } from "@/lib/types"

// Global instances for performance (singleton pattern)
let gnnModel: GraphNeuralNetwork | null = null
let biometricsProcessor: BiometricsProcessor | null = null

// Initialize models on first request
function initializeModels() {
  if (!gnnModel) {
    gnnModel = new GraphNeuralNetwork()
  }
  if (!biometricsProcessor) {
    biometricsProcessor = new BiometricsProcessor()
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Initialize models if needed
    initializeModels()

    const body = await request.json()
    const { transaction, biometric, recentTransactions } = body as {
      transaction: TransactionData
      biometric: BiometricData
      recentTransactions: TransactionData[]
    }

    // Validate input
    if (!transaction || !biometric) {
      return NextResponse.json({ error: "Missing required transaction or biometric data" }, { status: 400 })
    }

    // Process biometric data and detect anomalies
    const biometricAnomalies = await biometricsProcessor!.processBiometricData(biometric)

    // Build graph from recent transactions
    const { nodes, edges } = GraphBuilder.buildTransactionGraph(recentTransactions || [])

    // Generate graph embeddings
    const graphEmbeddings = await gnnModel!.processGraph(nodes, edges)

    // Generate fraud prediction
    const fraudPrediction = await gnnModel!.predictFraud(transaction, biometric, graphEmbeddings)

    // Combine biometric and graph-based insights
    const combinedExplanation = [
      ...fraudPrediction.explanation,
      ...biometricAnomalies.map((anomaly) => `Biometric: ${anomaly.description}`),
    ]

    // Adjust fraud probability based on biometric anomalies
    let adjustedProbability = fraudPrediction.fraudProbability
    const highSeverityAnomalies = biometricAnomalies.filter((a) => a.severity === "high")
    const mediumSeverityAnomalies = biometricAnomalies.filter((a) => a.severity === "medium")

    adjustedProbability += highSeverityAnomalies.length * 0.2
    adjustedProbability += mediumSeverityAnomalies.length * 0.1
    adjustedProbability = Math.min(1, adjustedProbability)

    // Determine final risk level
    let finalRiskLevel: "low" | "medium" | "high" = "low"
    if (adjustedProbability > 0.7) finalRiskLevel = "high"
    else if (adjustedProbability > 0.4) finalRiskLevel = "medium"

    const responseTime = Date.now() - startTime

    const response = {
      transactionId: transaction.id,
      fraudProbability: Math.round(adjustedProbability * 100) / 100,
      riskLevel: finalRiskLevel,
      explanation: combinedExplanation,
      biometricAnomalies: biometricAnomalies.length,
      graphNodes: nodes.length,
      confidence: fraudPrediction.confidence,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
      modelVersion: "1.0.0",
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Fraud detection error:", error)
    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        error: "Internal server error",
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

// Health check endpoint
export async function GET() {
  const startTime = Date.now()

  try {
    initializeModels()

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: "healthy",
      models: {
        gnn: gnnModel ? "loaded" : "not loaded",
        biometrics: biometricsProcessor ? "loaded" : "not loaded",
      },
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({ status: "unhealthy", error: "Model initialization failed" }, { status: 500 })
  }
}
