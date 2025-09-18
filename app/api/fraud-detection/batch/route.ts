// Batch processing endpoint for multiple transactions
import { type NextRequest, NextResponse } from "next/server"
import { GraphNeuralNetwork } from "@/lib/gnn-model"
import { BiometricsProcessor } from "@/lib/biometrics-processor"
import { GraphBuilder } from "@/lib/data-ingestion"
import type { TransactionData, BiometricData } from "@/lib/types"

let gnnModel: GraphNeuralNetwork | null = null
let biometricsProcessor: BiometricsProcessor | null = null

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
    initializeModels()

    const body = await request.json()
    const { transactions, biometrics, recentTransactions } = body as {
      transactions: TransactionData[]
      biometrics: BiometricData[]
      recentTransactions: TransactionData[]
    }

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: "Missing or invalid transactions array" }, { status: 400 })
    }

    // Build graph from all transactions
    const allTransactions = [...(recentTransactions || []), ...transactions]
    const { nodes, edges } = GraphBuilder.buildTransactionGraph(allTransactions)
    const graphEmbeddings = await gnnModel!.processGraph(nodes, edges)

    // Process each transaction
    const results = await Promise.all(
      transactions.map(async (transaction, index) => {
        const biometric = biometrics?.[index]

        if (!biometric) {
          return {
            transactionId: transaction.id,
            error: "Missing biometric data",
            fraudProbability: 0.5,
            riskLevel: "medium" as const,
          }
        }

        try {
          // Process biometric data
          const biometricAnomalies = await biometricsProcessor!.processBiometricData(biometric)

          // Generate fraud prediction
          const fraudPrediction = await gnnModel!.predictFraud(transaction, biometric, graphEmbeddings)

          // Combine insights
          let adjustedProbability = fraudPrediction.fraudProbability
          const highSeverityAnomalies = biometricAnomalies.filter((a) => a.severity === "high")
          const mediumSeverityAnomalies = biometricAnomalies.filter((a) => a.severity === "medium")

          adjustedProbability += highSeverityAnomalies.length * 0.2
          adjustedProbability += mediumSeverityAnomalies.length * 0.1
          adjustedProbability = Math.min(1, adjustedProbability)

          let finalRiskLevel: "low" | "medium" | "high" = "low"
          if (adjustedProbability > 0.7) finalRiskLevel = "high"
          else if (adjustedProbability > 0.4) finalRiskLevel = "medium"

          return {
            transactionId: transaction.id,
            fraudProbability: Math.round(adjustedProbability * 100) / 100,
            riskLevel: finalRiskLevel,
            explanation: [
              ...fraudPrediction.explanation,
              ...biometricAnomalies.map((anomaly) => `Biometric: ${anomaly.description}`),
            ],
            biometricAnomalies: biometricAnomalies.length,
            confidence: fraudPrediction.confidence,
          }
        } catch (error) {
          console.error(`Error processing transaction ${transaction.id}:`, error)
          return {
            transactionId: transaction.id,
            error: "Processing failed",
            fraudProbability: 0.5,
            riskLevel: "medium" as const,
          }
        }
      }),
    )

    const responseTime = Date.now() - startTime
    const avgResponseTime = responseTime / transactions.length

    return NextResponse.json({
      results,
      summary: {
        totalTransactions: transactions.length,
        highRisk: results.filter((r) => r.riskLevel === "high").length,
        mediumRisk: results.filter((r) => r.riskLevel === "medium").length,
        lowRisk: results.filter((r) => r.riskLevel === "low").length,
        errors: results.filter((r) => r.error).length,
      },
      performance: {
        totalResponseTime: `${responseTime}ms`,
        avgResponseTime: `${avgResponseTime.toFixed(1)}ms`,
        throughput: `${(transactions.length / (responseTime / 1000)).toFixed(1)} transactions/sec`,
      },
      timestamp: new Date().toISOString(),
      modelVersion: "1.0.0",
    })
  } catch (error) {
    console.error("Batch fraud detection error:", error)
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
