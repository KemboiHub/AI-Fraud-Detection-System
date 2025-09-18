"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { DataIngestionPipeline } from "@/lib/data-ingestion"
import { FraudDetectionClient } from "@/lib/fraud-detection-client"
import type { TransactionData, BiometricData } from "@/lib/types"
import type { FraudDetectionResponse } from "@/lib/fraud-detection-client"
import { AlertTriangle, Shield, Activity, Zap, Eye, Brain } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts"

interface DashboardMetrics {
  totalTransactions: number
  fraudDetected: number
  falsePositives: number
  avgResponseTime: number
  systemUptime: number
  riskDistribution: { low: number; medium: number; high: number }
}

interface RealtimeTransaction {
  transaction: TransactionData
  biometric: BiometricData
  prediction?: FraudDetectionResponse
  timestamp: Date
}

export default function FraudDetectionDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [realtimeTransactions, setRealtimeTransactions] = useState<RealtimeTransaction[]>([])
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTransactions: 0,
    fraudDetected: 0,
    falsePositives: 0,
    avgResponseTime: 0,
    systemUptime: 99.9,
    riskDistribution: { low: 0, medium: 0, high: 0 },
  })
  const [selectedTransaction, setSelectedTransaction] = useState<RealtimeTransaction | null>(null)
  const [dataIngestion] = useState(() => new DataIngestionPipeline())
  const [fraudClient] = useState(() => new FraudDetectionClient())

  // Start/stop real-time monitoring
  const toggleMonitoring = useCallback(() => {
    if (isRunning) {
      setIsRunning(false)
    } else {
      setIsRunning(true)

      // Subscribe to data ingestion pipeline
      dataIngestion.subscribe(async (data) => {
        const { transaction, biometric } = data

        try {
          // Get recent transactions for context
          const recentTransactions = dataIngestion.getRecentTransactions(20)

          // Call fraud detection API
          const prediction = await fraudClient.detectFraud(transaction, biometric, recentTransactions)

          const realtimeTransaction: RealtimeTransaction = {
            transaction,
            biometric,
            prediction,
            timestamp: new Date(),
          }

          setRealtimeTransactions((prev) => {
            const updated = [realtimeTransaction, ...prev].slice(0, 100) // Keep last 100

            // Update metrics
            const total = updated.length
            const fraudCount = updated.filter((t) => t.prediction && t.prediction.riskLevel === "high").length
            const mediumRisk = updated.filter((t) => t.prediction && t.prediction.riskLevel === "medium").length
            const lowRisk = updated.filter((t) => t.prediction && t.prediction.riskLevel === "low").length

            setMetrics((prevMetrics) => ({
              ...prevMetrics,
              totalTransactions: total,
              fraudDetected: fraudCount,
              avgResponseTime:
                updated
                  .filter((t) => t.prediction)
                  .reduce((sum, t) => sum + Number.parseInt(t.prediction!.responseTime), 0) /
                  updated.filter((t) => t.prediction).length || 0,
              riskDistribution: { low: lowRisk, medium: mediumRisk, high: fraudCount },
            }))

            return updated
          })
        } catch (error) {
          console.error("Fraud detection failed:", error)

          const realtimeTransaction: RealtimeTransaction = {
            transaction,
            biometric,
            timestamp: new Date(),
          }

          setRealtimeTransactions((prev) => [realtimeTransaction, ...prev].slice(0, 100))
        }
      })
    }
  }, [isRunning, dataIngestion, fraudClient])

  // Chart data preparation
  const chartData = realtimeTransactions
    .slice(0, 20)
    .reverse()
    .map((t, index) => ({
      index: index + 1,
      fraudProbability: t.prediction?.fraudProbability || 0,
      responseTime: t.prediction ? Number.parseInt(t.prediction.responseTime) : 0,
      amount: t.transaction.amount,
      riskLevel: t.prediction?.riskLevel || "unknown",
    }))

  const riskDistributionData = [
    { name: "Low Risk", value: metrics.riskDistribution.low, color: "#10b981" },
    { name: "Medium Risk", value: metrics.riskDistribution.medium, color: "#f59e0b" },
    { name: "High Risk", value: metrics.riskDistribution.high, color: "#ef4444" },
  ]

  const performanceData = chartData.map((d) => ({
    transaction: d.index,
    responseTime: d.responseTime,
  }))

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AI Fraud Detection System</h1>
            <p className="text-muted-foreground">Real-time transaction monitoring with Graph Neural Networks</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isRunning ? "default" : "secondary"} className="px-3 py-1">
              {isRunning ? "LIVE" : "STOPPED"}
            </Badge>
            <Button onClick={toggleMonitoring} variant={isRunning ? "destructive" : "default"}>
              {isRunning ? "Stop Monitoring" : "Start Monitoring"}
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                +{realtimeTransactions.filter((t) => new Date().getTime() - t.timestamp.getTime() < 60000).length} in
                last minute
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fraud Detected</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{metrics.fraudDetected}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.totalTransactions > 0
                  ? `${((metrics.fraudDetected / metrics.totalTransactions) * 100).toFixed(1)}% fraud rate`
                  : "No data yet"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.avgResponseTime.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground">Target: &lt;200ms</p>
              <Progress value={Math.min(100, (200 - metrics.avgResponseTime) / 2)} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Shield className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.systemUptime}%</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="realtime" className="space-y-4">
          <TabsList>
            <TabsTrigger value="realtime">Real-time Monitoring</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="graph">Graph Visualization</TabsTrigger>
            <TabsTrigger value="biometrics">Biometric Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Real-time Transaction Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Transaction Feed
                  </CardTitle>
                  <CardDescription>Real-time fraud detection results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {realtimeTransactions.slice(0, 10).map((t, index) => (
                      <div
                        key={`${t.transaction.id}-${index}`}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedTransaction(t)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              t.prediction?.riskLevel === "high"
                                ? "destructive"
                                : t.prediction?.riskLevel === "medium"
                                  ? "secondary"
                                  : "default"
                            }
                          >
                            {t.prediction?.riskLevel || "processing"}
                          </Badge>
                          <div>
                            <p className="font-medium">${t.transaction.amount}</p>
                            <p className="text-sm text-muted-foreground">{t.transaction.merchant.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {t.prediction ? `${(t.prediction.fraudProbability * 100).toFixed(1)}%` : "..."}
                          </p>
                          <p className="text-sm text-muted-foreground">{t.timestamp.toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                    {realtimeTransactions.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {isRunning ? "Waiting for transactions..." : "Start monitoring to see live data"}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Fraud Probability Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Fraud Probability Trend</CardTitle>
                  <CardDescription>Last 20 transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis domain={[0, 1]} />
                      <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Fraud Probability"]} />
                      <Line
                        type="monotone"
                        dataKey="fraudProbability"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Transaction Details Modal */}
            {selectedTransaction && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Transaction Details
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>
                      ×
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Transaction Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span className="font-medium">${selectedTransaction.transaction.amount}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Merchant:</span>
                            <span className="font-medium">{selectedTransaction.transaction.merchant.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Location:</span>
                            <span className="font-medium">
                              {selectedTransaction.transaction.location.city},{" "}
                              {selectedTransaction.transaction.location.country}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payment Method:</span>
                            <span className="font-medium">{selectedTransaction.transaction.paymentMethod}</span>
                          </div>
                        </div>
                      </div>

                      {selectedTransaction.prediction && (
                        <div>
                          <h4 className="font-semibold mb-2">Fraud Analysis</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Risk Level:</span>
                              <Badge
                                variant={
                                  selectedTransaction.prediction.riskLevel === "high"
                                    ? "destructive"
                                    : selectedTransaction.prediction.riskLevel === "medium"
                                      ? "secondary"
                                      : "default"
                                }
                              >
                                {selectedTransaction.prediction.riskLevel}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Fraud Probability:</span>
                              <span className="font-medium">
                                {(selectedTransaction.prediction.fraudProbability * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Confidence:</span>
                              <span className="font-medium">
                                {(selectedTransaction.prediction.confidence * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Response Time:</span>
                              <span className="font-medium">{selectedTransaction.prediction.responseTime}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {selectedTransaction.prediction && (
                        <div>
                          <h4 className="font-semibold mb-2">Risk Factors</h4>
                          <div className="space-y-2">
                            {selectedTransaction.prediction.explanation.map((explanation, index) => (
                              <Alert key={index}>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription className="text-sm">{explanation}</AlertDescription>
                              </Alert>
                            ))}
                            {selectedTransaction.prediction.explanation.length === 0 && (
                              <p className="text-sm text-muted-foreground">No specific risk factors identified</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2">Biometric Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Typing Speed:</span>
                            <span className="font-medium">
                              {selectedTransaction.biometric.keystrokeDynamics.typingSpeed.toFixed(0)} WPM
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Dwell Time:</span>
                            <span className="font-medium">
                              {(
                                selectedTransaction.biometric.keystrokeDynamics.dwellTimes.reduce((a, b) => a + b, 0) /
                                selectedTransaction.biometric.keystrokeDynamics.dwellTimes.length
                              ).toFixed(0)}
                              ms
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Mouse Velocity:</span>
                            <span className="font-medium">
                              {(
                                selectedTransaction.biometric.mouseMovements.velocity.reduce((a, b) => a + b, 0) /
                                selectedTransaction.biometric.mouseMovements.velocity.length
                              ).toFixed(0)}{" "}
                              px/ms
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Transaction risk levels</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Response Time Performance</CardTitle>
                  <CardDescription>API response times (target: &lt;200ms)</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="transaction" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => [`${value}ms`, "Response Time"]} />
                      <Bar dataKey="responseTime" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Amount vs Risk */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Transaction Amount vs Fraud Probability</CardTitle>
                  <CardDescription>Correlation between transaction size and fraud risk</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="amount" name="Amount" unit="$" />
                      <YAxis dataKey="fraudProbability" name="Fraud Probability" domain={[0, 1]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        formatter={(value: number, name: string) => [
                          name === "fraudProbability" ? `${(value * 100).toFixed(1)}%` : `$${value}`,
                          name === "fraudProbability" ? "Fraud Probability" : "Amount",
                        ]}
                      />
                      <Scatter name="Transactions" dataKey="fraudProbability" fill="#ef4444" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="graph" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Graph Neural Network Visualization
                </CardTitle>
                <CardDescription>User-transaction-merchant relationship graph</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <div className="text-center space-y-2">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Graph visualization would be rendered here</p>
                    <p className="text-sm text-muted-foreground">
                      In production: D3.js or vis.js network graph showing user-merchant-device relationships
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="biometrics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Behavioral Biometrics Analysis
                </CardTitle>
                <CardDescription>User behavior patterns and anomaly detection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-96 flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg">
                  <div className="text-center space-y-2">
                    <Eye className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Biometric analysis charts would be rendered here</p>
                    <p className="text-sm text-muted-foreground">
                      In production: Keystroke dynamics, mouse patterns, and device sensor visualizations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
