// Shared type definitions for the fraud detection system
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
