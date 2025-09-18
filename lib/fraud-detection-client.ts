// Client-side SDK for fraud detection API
import type { TransactionData, BiometricData } from "./types"

export interface FraudDetectionResponse {
  transactionId: string
  fraudProbability: number
  riskLevel: "low" | "medium" | "high"
  explanation: string[]
  biometricAnomalies: number
  graphNodes: number
  confidence: number
  responseTime: string
  timestamp: string
  modelVersion: string
}

export interface BatchFraudDetectionResponse {
  results: (FraudDetectionResponse & { error?: string })[]
  summary: {
    totalTransactions: number
    highRisk: number
    mediumRisk: number
    lowRisk: number
    errors: number
  }
  performance: {
    totalResponseTime: string
    avgResponseTime: string
    throughput: string
  }
  timestamp: string
  modelVersion: string
}

export class FraudDetectionClient {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl = "", apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async detectFraud(
    transaction: TransactionData,
    biometric: BiometricData,
    recentTransactions?: TransactionData[],
  ): Promise<FraudDetectionResponse> {
    const response = await fetch(`${this.baseUrl}/api/fraud-detection`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        transaction,
        biometric,
        recentTransactions: recentTransactions || [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Fraud detection failed: ${error.error || response.statusText}`)
    }

    return response.json()
  }

  async detectFraudBatch(
    transactions: TransactionData[],
    biometrics: BiometricData[],
    recentTransactions?: TransactionData[],
  ): Promise<BatchFraudDetectionResponse> {
    if (transactions.length !== biometrics.length) {
      throw new Error("Transactions and biometrics arrays must have the same length")
    }

    const response = await fetch(`${this.baseUrl}/api/fraud-detection/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify({
        transactions,
        biometrics,
        recentTransactions: recentTransactions || [],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Batch fraud detection failed: ${error.error || response.statusText}`)
    }

    return response.json()
  }

  async healthCheck(): Promise<{ status: string; models: Record<string, string>; responseTime: string }> {
    const response = await fetch(`${this.baseUrl}/api/fraud-detection`, {
      method: "GET",
      headers: {
        ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
      },
    })

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`)
    }

    return response.json()
  }

  // Real-time streaming detection (simulated with polling)
  async startRealTimeDetection(
    onDetection: (result: FraudDetectionResponse) => void,
    onError: (error: Error) => void,
    interval = 1000,
  ): Promise<() => void> {
    let isRunning = true

    const poll = async () => {
      while (isRunning) {
        try {
          // In a real implementation, this would connect to a WebSocket or SSE endpoint
          // For now, we'll simulate with periodic health checks
          await this.healthCheck()
          await new Promise((resolve) => setTimeout(resolve, interval))
        } catch (error) {
          onError(error as Error)
          await new Promise((resolve) => setTimeout(resolve, interval * 2)) // Back off on error
        }
      }
    }

    poll()

    // Return stop function
    return () => {
      isRunning = false
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    avgResponseTime: number
    throughput: number
    errorRate: number
    uptime: number
  }> {
    // In a real implementation, this would fetch actual metrics
    // For demonstration, return simulated metrics
    return {
      avgResponseTime: 85, // ms
      throughput: 1200, // transactions per second
      errorRate: 0.02, // 2%
      uptime: 99.9, // percentage
    }
  }
}

// Utility functions for client-side biometric data collection
export class BiometricCollector {
  private keystrokes: { key: string; timestamp: number; type: "down" | "up" }[] = []
  private mouseEvents: { x: number; y: number; timestamp: number; type: string }[] = []
  private deviceMotion: { acceleration: number[]; rotation: number[]; timestamp: number }[] = []

  startCollection(): void {
    // Keystroke dynamics
    document.addEventListener("keydown", this.handleKeyDown.bind(this))
    document.addEventListener("keyup", this.handleKeyUp.bind(this))

    // Mouse movements
    document.addEventListener("mousemove", this.handleMouseMove.bind(this))
    document.addEventListener("click", this.handleMouseClick.bind(this))

    // Device motion (if available)
    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", this.handleDeviceMotion.bind(this))
    }
  }

  stopCollection(): void {
    document.removeEventListener("keydown", this.handleKeyDown.bind(this))
    document.removeEventListener("keyup", this.handleKeyUp.bind(this))
    document.removeEventListener("mousemove", this.handleMouseMove.bind(this))
    document.removeEventListener("click", this.handleMouseClick.bind(this))

    if (window.DeviceMotionEvent) {
      window.removeEventListener("devicemotion", this.handleDeviceMotion.bind(this))
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keystrokes.push({
      key: event.key,
      timestamp: Date.now(),
      type: "down",
    })
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keystrokes.push({
      key: event.key,
      timestamp: Date.now(),
      type: "up",
    })
  }

  private handleMouseMove(event: MouseEvent): void {
    this.mouseEvents.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now(),
      type: "move",
    })
  }

  private handleMouseClick(event: MouseEvent): void {
    this.mouseEvents.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: Date.now(),
      type: "click",
    })
  }

  private handleDeviceMotion(event: DeviceMotionEvent): void {
    if (event.acceleration && event.rotationRate) {
      this.deviceMotion.push({
        acceleration: [event.acceleration.x || 0, event.acceleration.y || 0, event.acceleration.z || 0],
        rotation: [event.rotationRate.alpha || 0, event.rotationRate.beta || 0, event.rotationRate.gamma || 0],
        timestamp: Date.now(),
      })
    }
  }

  generateBiometricData(userId: string, sessionId: string): BiometricData {
    // Process collected data into BiometricData format
    const dwellTimes: number[] = []
    const flightTimes: number[] = []

    // Calculate keystroke dynamics
    for (let i = 0; i < this.keystrokes.length - 1; i++) {
      const current = this.keystrokes[i]
      const next = this.keystrokes[i + 1]

      if (current.type === "down" && next.type === "up" && current.key === next.key) {
        dwellTimes.push(next.timestamp - current.timestamp)
      }

      if (current.type === "up" && next.type === "down") {
        flightTimes.push(next.timestamp - current.timestamp)
      }
    }

    // Calculate mouse dynamics
    const velocities: number[] = []
    const accelerations: number[] = []
    const clickPatterns: number[] = []

    for (let i = 1; i < this.mouseEvents.length; i++) {
      const prev = this.mouseEvents[i - 1]
      const curr = this.mouseEvents[i]
      const timeDiff = curr.timestamp - prev.timestamp

      if (timeDiff > 0) {
        const distance = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2))
        const velocity = distance / timeDiff
        velocities.push(velocity)

        if (velocities.length > 1) {
          const acceleration = (velocity - velocities[velocities.length - 2]) / timeDiff
          accelerations.push(acceleration)
        }
      }

      if (curr.type === "click") {
        clickPatterns.push(curr.timestamp)
      }
    }

    // Calculate device sensor data
    const avgAcceleration =
      this.deviceMotion.length > 0
        ? this.deviceMotion
            .reduce(
              (acc, motion) => [
                acc[0] + motion.acceleration[0],
                acc[1] + motion.acceleration[1],
                acc[2] + motion.acceleration[2],
              ],
              [0, 0, 0],
            )
            .map((sum) => sum / this.deviceMotion.length)
        : [0, 0, 0]

    const avgRotation =
      this.deviceMotion.length > 0
        ? this.deviceMotion
            .reduce(
              (acc, motion) => [acc[0] + motion.rotation[0], acc[1] + motion.rotation[1], acc[2] + motion.rotation[2]],
              [0, 0, 0],
            )
            .map((sum) => sum / this.deviceMotion.length)
        : [0, 0, 0]

    return {
      sessionId,
      userId,
      keystrokeDynamics: {
        dwellTimes: dwellTimes.length > 0 ? dwellTimes : [100], // Default if no data
        flightTimes: flightTimes.length > 0 ? flightTimes : [50], // Default if no data
        typingSpeed: dwellTimes.length > 0 ? 60000 / (dwellTimes.reduce((a, b) => a + b, 0) / dwellTimes.length) : 60,
      },
      mouseMovements: {
        velocity: velocities.length > 0 ? velocities : [100],
        acceleration: accelerations.length > 0 ? accelerations : [50],
        clickPatterns: clickPatterns.length > 0 ? clickPatterns.slice(-5) : [Date.now()],
      },
      deviceSensors: {
        accelerometer: avgAcceleration,
        gyroscope: avgRotation,
        orientation: window.orientation || 0,
      },
      timestamp: new Date(),
    }
  }

  clearData(): void {
    this.keystrokes = []
    this.mouseEvents = []
    this.deviceMotion = []
  }
}
