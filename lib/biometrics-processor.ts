// Advanced behavioral biometrics processing for fraud detection
import type { BiometricData } from "./data-ingestion"

export interface BiometricProfile {
  userId: string
  keystrokeProfile: KeystrokeProfile
  mouseProfile: MouseProfile
  deviceProfile: DeviceProfile
  sessionCount: number
  lastUpdated: Date
  confidence: number
}

export interface KeystrokeProfile {
  avgDwellTime: number
  avgFlightTime: number
  dwellTimeVariance: number
  flightTimeVariance: number
  typingRhythm: number[]
  preferredTypingSpeed: number
  keyPressurePattern: number[]
}

export interface MouseProfile {
  avgVelocity: number
  avgAcceleration: number
  clickRhythm: number[]
  movementPattern: "smooth" | "jerky" | "mixed"
  preferredClickSpeed: number
  scrollBehavior: number[]
}

export interface DeviceProfile {
  orientationPreference: number
  accelerometerBaseline: number[]
  gyroscopeBaseline: number[]
  deviceStability: number
  handedness: "left" | "right" | "ambidextrous"
}

export interface BiometricAnomaly {
  type: "keystroke" | "mouse" | "device" | "session"
  severity: "low" | "medium" | "high"
  description: string
  confidence: number
  deviationScore: number
}

export class BiometricsProcessor {
  private userProfiles: Map<string, BiometricProfile> = new Map()
  private sessionData: Map<string, BiometricData[]> = new Map()

  constructor() {
    this.initializeBaselineProfiles()
  }

  private initializeBaselineProfiles() {
    // Initialize some baseline user profiles for demonstration
    const baselineUsers = ["user_001", "user_002", "user_003", "user_004", "user_005"]

    baselineUsers.forEach((userId) => {
      this.userProfiles.set(userId, this.generateBaselineProfile(userId))
    })
  }

  private generateBaselineProfile(userId: string): BiometricProfile {
    return {
      userId,
      keystrokeProfile: {
        avgDwellTime: 80 + Math.random() * 40,
        avgFlightTime: 60 + Math.random() * 30,
        dwellTimeVariance: 15 + Math.random() * 10,
        flightTimeVariance: 12 + Math.random() * 8,
        typingRhythm: Array.from({ length: 10 }, () => Math.random()),
        preferredTypingSpeed: 45 + Math.random() * 35,
        keyPressurePattern: Array.from({ length: 5 }, () => Math.random()),
      },
      mouseProfile: {
        avgVelocity: 300 + Math.random() * 200,
        avgAcceleration: 150 + Math.random() * 100,
        clickRhythm: Array.from({ length: 5 }, () => Math.random() * 200 + 100),
        movementPattern: Math.random() > 0.5 ? "smooth" : "jerky",
        preferredClickSpeed: 200 + Math.random() * 100,
        scrollBehavior: Array.from({ length: 3 }, () => Math.random()),
      },
      deviceProfile: {
        orientationPreference: Math.random() * 360,
        accelerometerBaseline: [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1],
        gyroscopeBaseline: [Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5],
        deviceStability: Math.random() * 0.5 + 0.5,
        handedness: Math.random() > 0.8 ? "left" : "right",
      },
      sessionCount: Math.floor(Math.random() * 100) + 50,
      lastUpdated: new Date(),
      confidence: 0.8 + Math.random() * 0.2,
    }
  }

  async processBiometricData(data: BiometricData): Promise<BiometricAnomaly[]> {
    const anomalies: BiometricAnomaly[] = []

    // Get or create user profile
    let userProfile = this.userProfiles.get(data.userId)
    if (!userProfile) {
      userProfile = this.generateBaselineProfile(data.userId)
      this.userProfiles.set(data.userId, userProfile)
    }

    // Store session data
    if (!this.sessionData.has(data.sessionId)) {
      this.sessionData.set(data.sessionId, [])
    }
    this.sessionData.get(data.sessionId)!.push(data)

    // Analyze keystroke dynamics
    const keystrokeAnomalies = this.analyzeKeystrokeDynamics(data, userProfile)
    anomalies.push(...keystrokeAnomalies)

    // Analyze mouse movements
    const mouseAnomalies = this.analyzeMouseMovements(data, userProfile)
    anomalies.push(...mouseAnomalies)

    // Analyze device sensors
    const deviceAnomalies = this.analyzeDeviceSensors(data, userProfile)
    anomalies.push(...deviceAnomalies)

    // Update user profile with new data
    this.updateUserProfile(data, userProfile)

    return anomalies
  }

  private analyzeKeystrokeDynamics(data: BiometricData, profile: BiometricProfile): BiometricAnomaly[] {
    const anomalies: BiometricAnomaly[] = []
    const { keystrokeDynamics } = data
    const { keystrokeProfile } = profile

    // Calculate current session metrics
    const avgDwellTime = keystrokeDynamics.dwellTimes.reduce((a, b) => a + b, 0) / keystrokeDynamics.dwellTimes.length
    const avgFlightTime =
      keystrokeDynamics.flightTimes.reduce((a, b) => a + b, 0) / keystrokeDynamics.flightTimes.length

    // Check for significant deviations
    const dwellTimeDeviation = Math.abs(avgDwellTime - keystrokeProfile.avgDwellTime) / keystrokeProfile.avgDwellTime
    const flightTimeDeviation =
      Math.abs(avgFlightTime - keystrokeProfile.avgFlightTime) / keystrokeProfile.avgFlightTime
    const typingSpeedDeviation =
      Math.abs(keystrokeDynamics.typingSpeed - keystrokeProfile.preferredTypingSpeed) /
      keystrokeProfile.preferredTypingSpeed

    if (dwellTimeDeviation > 0.4) {
      anomalies.push({
        type: "keystroke",
        severity: dwellTimeDeviation > 0.7 ? "high" : "medium",
        description: `Unusual key dwell time: ${avgDwellTime.toFixed(1)}ms vs expected ${keystrokeProfile.avgDwellTime.toFixed(1)}ms`,
        confidence: Math.min(0.95, dwellTimeDeviation),
        deviationScore: dwellTimeDeviation,
      })
    }

    if (flightTimeDeviation > 0.4) {
      anomalies.push({
        type: "keystroke",
        severity: flightTimeDeviation > 0.7 ? "high" : "medium",
        description: `Unusual key flight time: ${avgFlightTime.toFixed(1)}ms vs expected ${keystrokeProfile.avgFlightTime.toFixed(1)}ms`,
        confidence: Math.min(0.95, flightTimeDeviation),
        deviationScore: flightTimeDeviation,
      })
    }

    if (typingSpeedDeviation > 0.5) {
      anomalies.push({
        type: "keystroke",
        severity: typingSpeedDeviation > 0.8 ? "high" : "medium",
        description: `Unusual typing speed: ${keystrokeDynamics.typingSpeed.toFixed(1)} WPM vs expected ${keystrokeProfile.preferredTypingSpeed.toFixed(1)} WPM`,
        confidence: Math.min(0.95, typingSpeedDeviation),
        deviationScore: typingSpeedDeviation,
      })
    }

    return anomalies
  }

  private analyzeMouseMovements(data: BiometricData, profile: BiometricProfile): BiometricAnomaly[] {
    const anomalies: BiometricAnomaly[] = []
    const { mouseMovements } = data
    const { mouseProfile } = profile

    // Calculate current session metrics
    const avgVelocity = mouseMovements.velocity.reduce((a, b) => a + b, 0) / mouseMovements.velocity.length
    const avgAcceleration = mouseMovements.acceleration.reduce((a, b) => a + b, 0) / mouseMovements.acceleration.length
    const avgClickPattern =
      mouseMovements.clickPatterns.reduce((a, b) => a + b, 0) / mouseMovements.clickPatterns.length

    // Check for deviations
    const velocityDeviation = Math.abs(avgVelocity - mouseProfile.avgVelocity) / mouseProfile.avgVelocity
    const accelerationDeviation =
      Math.abs(avgAcceleration - mouseProfile.avgAcceleration) / mouseProfile.avgAcceleration
    const clickDeviation =
      Math.abs(avgClickPattern - mouseProfile.preferredClickSpeed) / mouseProfile.preferredClickSpeed

    if (velocityDeviation > 0.5) {
      anomalies.push({
        type: "mouse",
        severity: velocityDeviation > 0.8 ? "high" : "medium",
        description: `Unusual mouse velocity: ${avgVelocity.toFixed(1)} vs expected ${mouseProfile.avgVelocity.toFixed(1)}`,
        confidence: Math.min(0.95, velocityDeviation),
        deviationScore: velocityDeviation,
      })
    }

    if (accelerationDeviation > 0.5) {
      anomalies.push({
        type: "mouse",
        severity: accelerationDeviation > 0.8 ? "high" : "medium",
        description: `Unusual mouse acceleration pattern detected`,
        confidence: Math.min(0.95, accelerationDeviation),
        deviationScore: accelerationDeviation,
      })
    }

    // Detect movement pattern changes
    const currentPattern = this.classifyMovementPattern(mouseMovements.velocity, mouseMovements.acceleration)
    if (currentPattern !== mouseProfile.movementPattern) {
      anomalies.push({
        type: "mouse",
        severity: "medium",
        description: `Movement pattern changed from ${mouseProfile.movementPattern} to ${currentPattern}`,
        confidence: 0.7,
        deviationScore: 0.6,
      })
    }

    return anomalies
  }

  private analyzeDeviceSensors(data: BiometricData, profile: BiometricProfile): BiometricAnomaly[] {
    const anomalies: BiometricAnomaly[] = []
    const { deviceSensors } = data
    const { deviceProfile } = profile

    // Calculate deviations from baseline
    const accelDeviation = this.calculateVectorDeviation(
      deviceSensors.accelerometer,
      deviceProfile.accelerometerBaseline,
    )
    const gyroDeviation = this.calculateVectorDeviation(deviceSensors.gyroscope, deviceProfile.gyroscopeBaseline)
    const orientationDeviation = Math.abs(deviceSensors.orientation - deviceProfile.orientationPreference) / 360

    if (accelDeviation > 0.5) {
      anomalies.push({
        type: "device",
        severity: accelDeviation > 0.8 ? "high" : "medium",
        description: `Unusual device movement detected (accelerometer)`,
        confidence: Math.min(0.95, accelDeviation),
        deviationScore: accelDeviation,
      })
    }

    if (gyroDeviation > 0.5) {
      anomalies.push({
        type: "device",
        severity: gyroDeviation > 0.8 ? "high" : "medium",
        description: `Unusual device rotation detected (gyroscope)`,
        confidence: Math.min(0.95, gyroDeviation),
        deviationScore: gyroDeviation,
      })
    }

    if (orientationDeviation > 0.3) {
      anomalies.push({
        type: "device",
        severity: "low",
        description: `Device orientation differs from usual preference`,
        confidence: 0.6,
        deviationScore: orientationDeviation,
      })
    }

    return anomalies
  }

  private classifyMovementPattern(velocity: number[], acceleration: number[]): "smooth" | "jerky" | "mixed" {
    const velocityVariance = this.calculateVariance(velocity)
    const accelerationVariance = this.calculateVariance(acceleration)

    if (velocityVariance < 50000 && accelerationVariance < 25000) return "smooth"
    if (velocityVariance > 150000 || accelerationVariance > 75000) return "jerky"
    return "mixed"
  }

  private calculateVectorDeviation(current: number[], baseline: number[]): number {
    if (current.length !== baseline.length) return 1

    const sumSquaredDiff = current.reduce((sum, val, idx) => {
      const diff = val - baseline[idx]
      return sum + diff * diff
    }, 0)

    return Math.sqrt(sumSquaredDiff / current.length)
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const squaredDiffs = values.map((value) => Math.pow(value - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  }

  private updateUserProfile(data: BiometricData, profile: BiometricProfile) {
    // Exponential moving average for profile updates
    const alpha = 0.1 // Learning rate

    // Update keystroke profile
    const avgDwellTime =
      data.keystrokeDynamics.dwellTimes.reduce((a, b) => a + b, 0) / data.keystrokeDynamics.dwellTimes.length
    const avgFlightTime =
      data.keystrokeDynamics.flightTimes.reduce((a, b) => a + b, 0) / data.keystrokeDynamics.flightTimes.length

    profile.keystrokeProfile.avgDwellTime = (1 - alpha) * profile.keystrokeProfile.avgDwellTime + alpha * avgDwellTime
    profile.keystrokeProfile.avgFlightTime =
      (1 - alpha) * profile.keystrokeProfile.avgFlightTime + alpha * avgFlightTime
    profile.keystrokeProfile.preferredTypingSpeed =
      (1 - alpha) * profile.keystrokeProfile.preferredTypingSpeed + alpha * data.keystrokeDynamics.typingSpeed

    // Update mouse profile
    const avgVelocity = data.mouseMovements.velocity.reduce((a, b) => a + b, 0) / data.mouseMovements.velocity.length
    const avgAcceleration =
      data.mouseMovements.acceleration.reduce((a, b) => a + b, 0) / data.mouseMovements.acceleration.length

    profile.mouseProfile.avgVelocity = (1 - alpha) * profile.mouseProfile.avgVelocity + alpha * avgVelocity
    profile.mouseProfile.avgAcceleration = (1 - alpha) * profile.mouseProfile.avgAcceleration + alpha * avgAcceleration

    // Update device profile
    for (let i = 0; i < 3; i++) {
      profile.deviceProfile.accelerometerBaseline[i] =
        (1 - alpha) * profile.deviceProfile.accelerometerBaseline[i] + alpha * data.deviceSensors.accelerometer[i]
      profile.deviceProfile.gyroscopeBaseline[i] =
        (1 - alpha) * profile.deviceProfile.gyroscopeBaseline[i] + alpha * data.deviceSensors.gyroscope[i]
    }

    profile.sessionCount++
    profile.lastUpdated = new Date()
    profile.confidence = Math.min(0.95, profile.confidence + 0.01) // Gradually increase confidence
  }

  getUserProfile(userId: string): BiometricProfile | undefined {
    return this.userProfiles.get(userId)
  }

  getAllProfiles(): BiometricProfile[] {
    return Array.from(this.userProfiles.values())
  }

  // Generate biometric embeddings for ML model fusion
  generateBiometricEmbedding(data: BiometricData, profile?: BiometricProfile): number[] {
    const embedding = new Array(32).fill(0)

    // Keystroke features (8 dimensions)
    const avgDwellTime =
      data.keystrokeDynamics.dwellTimes.reduce((a, b) => a + b, 0) / data.keystrokeDynamics.dwellTimes.length
    const avgFlightTime =
      data.keystrokeDynamics.flightTimes.reduce((a, b) => a + b, 0) / data.keystrokeDynamics.flightTimes.length

    embedding[0] = avgDwellTime / 200 // normalized
    embedding[1] = avgFlightTime / 100 // normalized
    embedding[2] = data.keystrokeDynamics.typingSpeed / 100 // normalized
    embedding[3] = this.calculateVariance(data.keystrokeDynamics.dwellTimes) / 1000 // normalized variance

    // Mouse features (8 dimensions)
    const avgVelocity = data.mouseMovements.velocity.reduce((a, b) => a + b, 0) / data.mouseMovements.velocity.length
    const avgAcceleration =
      data.mouseMovements.acceleration.reduce((a, b) => a + b, 0) / data.mouseMovements.acceleration.length

    embedding[8] = avgVelocity / 1000 // normalized
    embedding[9] = avgAcceleration / 500 // normalized
    embedding[10] = this.calculateVariance(data.mouseMovements.velocity) / 100000 // normalized variance
    embedding[11] = this.calculateVariance(data.mouseMovements.acceleration) / 50000 // normalized variance

    // Device sensor features (8 dimensions)
    embedding[16] = Math.abs(data.deviceSensors.accelerometer[0])
    embedding[17] = Math.abs(data.deviceSensors.accelerometer[1])
    embedding[18] = Math.abs(data.deviceSensors.accelerometer[2])
    embedding[19] = Math.abs(data.deviceSensors.gyroscope[0]) / 360
    embedding[20] = Math.abs(data.deviceSensors.gyroscope[1]) / 360
    embedding[21] = Math.abs(data.deviceSensors.gyroscope[2]) / 360
    embedding[22] = data.deviceSensors.orientation / 360

    // Profile deviation features (8 dimensions) - if profile exists
    if (profile) {
      const dwellDeviation =
        Math.abs(avgDwellTime - profile.keystrokeProfile.avgDwellTime) / profile.keystrokeProfile.avgDwellTime
      const velocityDeviation =
        Math.abs(avgVelocity - profile.mouseProfile.avgVelocity) / profile.mouseProfile.avgVelocity

      embedding[24] = Math.min(1, dwellDeviation)
      embedding[25] = Math.min(1, velocityDeviation)
      embedding[26] = profile.confidence
      embedding[27] = Math.log(profile.sessionCount + 1) / 10 // normalized session count
    }

    return embedding
  }
}
