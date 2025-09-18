// Data ingestion pipeline for real-time fraud detection
export interface TransactionData {
  id: string
  userId: string
  amount: number
  timestamp: Date
  location: {
    lat: number
    lng: number
    country: string
    city: string
  }
  merchant: {
    id: string
    name: string
    category: string
  }
  deviceId: string
  paymentMethod: string
}

export interface BiometricData {
  sessionId: string
  userId: string
  keystrokeDynamics: {
    dwellTimes: number[]
    flightTimes: number[]
    typingSpeed: number
  }
  mouseMovements: {
    velocity: number[]
    acceleration: number[]
    clickPatterns: number[]
  }
  deviceSensors: {
    accelerometer: number[]
    gyroscope: number[]
    orientation: number
  }
  timestamp: Date
}

export interface GraphNode {
  id: string
  type: "user" | "device" | "merchant" | "location"
  properties: Record<string, any>
}

export interface GraphEdge {
  source: string
  target: string
  type: string
  weight: number
  timestamp: Date
}

// Simulated Kafka-like streaming data ingestion
export class DataIngestionPipeline {
  private transactionStream: TransactionData[] = []
  private biometricStream: BiometricData[] = []
  private subscribers: ((data: any) => void)[] = []

  constructor() {
    this.startSimulation()
  }

  subscribe(callback: (data: any) => void) {
    this.subscribers.push(callback)
  }

  private startSimulation() {
    // Simulate real-time data ingestion every 2 seconds
    setInterval(() => {
      const transaction = this.generateMockTransaction()
      const biometric = this.generateMockBiometric(transaction.userId)

      this.transactionStream.push(transaction)
      this.biometricStream.push(biometric)

      // Notify subscribers
      this.subscribers.forEach((callback) => {
        callback({
          transaction,
          biometric,
          timestamp: new Date(),
        })
      })
    }, 2000)
  }

  private generateMockTransaction(): TransactionData {
    const users = ["user_001", "user_002", "user_003", "user_004", "user_005"]
    const merchants = [
      { id: "merch_001", name: "Amazon", category: "retail" },
      { id: "merch_002", name: "Starbucks", category: "food" },
      { id: "merch_003", name: "Shell", category: "gas" },
      { id: "merch_004", name: "Target", category: "retail" },
      { id: "merch_005", name: "ATM_001", category: "atm" },
    ]

    const locations = [
      { lat: 40.7128, lng: -74.006, country: "US", city: "New York" },
      { lat: 34.0522, lng: -118.2437, country: "US", city: "Los Angeles" },
      { lat: 41.8781, lng: -87.6298, country: "US", city: "Chicago" },
      { lat: 29.7604, lng: -95.3698, country: "US", city: "Houston" },
    ]

    // Occasionally generate suspicious transactions
    const isSuspicious = Math.random() < 0.15
    const baseAmount = Math.random() * 500 + 10
    const amount = isSuspicious ? baseAmount * 10 : baseAmount

    return {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: users[Math.floor(Math.random() * users.length)],
      amount: Math.round(amount * 100) / 100,
      timestamp: new Date(),
      location: locations[Math.floor(Math.random() * locations.length)],
      merchant: merchants[Math.floor(Math.random() * merchants.length)],
      deviceId: `device_${Math.floor(Math.random() * 10) + 1}`,
      paymentMethod: Math.random() > 0.5 ? "credit_card" : "debit_card",
    }
  }

  private generateMockBiometric(userId: string): BiometricData {
    return {
      sessionId: `session_${Date.now()}`,
      userId,
      keystrokeDynamics: {
        dwellTimes: Array.from({ length: 10 }, () => Math.random() * 200 + 50),
        flightTimes: Array.from({ length: 9 }, () => Math.random() * 100 + 20),
        typingSpeed: Math.random() * 80 + 40,
      },
      mouseMovements: {
        velocity: Array.from({ length: 20 }, () => Math.random() * 1000),
        acceleration: Array.from({ length: 20 }, () => Math.random() * 500),
        clickPatterns: Array.from({ length: 5 }, () => Math.random() * 300),
      },
      deviceSensors: {
        accelerometer: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1],
        gyroscope: [Math.random() * 360, Math.random() * 360, Math.random() * 360],
        orientation: Math.random() * 360,
      },
      timestamp: new Date(),
    }
  }

  getRecentTransactions(limit = 50): TransactionData[] {
    return this.transactionStream.slice(-limit)
  }

  getRecentBiometrics(limit = 50): BiometricData[] {
    return this.biometricStream.slice(-limit)
  }
}

// Graph construction utilities
export class GraphBuilder {
  static buildTransactionGraph(transactions: TransactionData[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const nodeMap = new Map<string, GraphNode>()

    transactions.forEach((tx) => {
      // Create user node
      if (!nodeMap.has(tx.userId)) {
        const userNode: GraphNode = {
          id: tx.userId,
          type: "user",
          properties: { userId: tx.userId },
        }
        nodes.push(userNode)
        nodeMap.set(tx.userId, userNode)
      }

      // Create merchant node
      if (!nodeMap.has(tx.merchant.id)) {
        const merchantNode: GraphNode = {
          id: tx.merchant.id,
          type: "merchant",
          properties: {
            name: tx.merchant.name,
            category: tx.merchant.category,
          },
        }
        nodes.push(merchantNode)
        nodeMap.set(tx.merchant.id, merchantNode)
      }

      // Create device node
      if (!nodeMap.has(tx.deviceId)) {
        const deviceNode: GraphNode = {
          id: tx.deviceId,
          type: "device",
          properties: { deviceId: tx.deviceId },
        }
        nodes.push(deviceNode)
        nodeMap.set(tx.deviceId, deviceNode)
      }

      // Create location node
      const locationId = `${tx.location.city}_${tx.location.country}`
      if (!nodeMap.has(locationId)) {
        const locationNode: GraphNode = {
          id: locationId,
          type: "location",
          properties: tx.location,
        }
        nodes.push(locationNode)
        nodeMap.set(locationId, locationNode)
      }

      // Create edges
      edges.push({
        source: tx.userId,
        target: tx.merchant.id,
        type: "transacted_with",
        weight: tx.amount,
        timestamp: tx.timestamp,
      })

      edges.push({
        source: tx.userId,
        target: tx.deviceId,
        type: "used_device",
        weight: 1,
        timestamp: tx.timestamp,
      })

      edges.push({
        source: tx.deviceId,
        target: locationId,
        type: "located_at",
        weight: 1,
        timestamp: tx.timestamp,
      })
    })

    return { nodes, edges }
  }
}
