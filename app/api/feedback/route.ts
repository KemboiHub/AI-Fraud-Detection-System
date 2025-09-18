// API endpoints for feedback system
import { type NextRequest, NextResponse } from "next/server"
import { FeedbackSystem } from "@/lib/feedback-system"
import type { FeedbackData } from "@/lib/feedback-system"

// Global feedback system instance
let feedbackSystem: FeedbackSystem | null = null

function initializeFeedbackSystem() {
  if (!feedbackSystem) {
    feedbackSystem = new FeedbackSystem()
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    initializeFeedbackSystem()

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case "submit_feedback": {
        const feedback = data as FeedbackData
        await feedbackSystem!.submitFeedback(feedback)

        return NextResponse.json({
          success: true,
          message: "Feedback submitted successfully",
          transactionId: feedback.transactionId,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "submit_batch_feedback": {
        const feedbackBatch = data as FeedbackData[]
        await feedbackSystem!.submitBatchFeedback(feedbackBatch)

        return NextResponse.json({
          success: true,
          message: `Batch feedback submitted: ${feedbackBatch.length} items`,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "identify_uncertain": {
        const { predictions, transactions, biometrics } = data
        const queries = await feedbackSystem!.identifyUncertainTransactions(predictions, transactions, biometrics)

        return NextResponse.json({
          queries,
          count: queries.length,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feedback API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    initializeFeedbackSystem()

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    switch (action) {
      case "pending_reviews": {
        const pendingReviews = await feedbackSystem!.getPendingReviews()
        return NextResponse.json({
          pendingReviews,
          count: pendingReviews.length,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "feedback_history": {
        const limit = Number.parseInt(searchParams.get("limit") || "100")
        const history = await feedbackSystem!.getFeedbackHistory(limit)
        return NextResponse.json({
          history,
          count: history.length,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "model_performance": {
        const performance = await feedbackSystem!.getModelPerformance()
        return NextResponse.json({
          performance,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "reviewer_workload": {
        const workload = await feedbackSystem!.getReviewerWorkload()
        const workloadArray = Array.from(workload.entries()).map(([reviewer, count]) => ({ reviewer, count }))
        return NextResponse.json({
          workload: workloadArray,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "update_queue": {
        const queueStatus = await feedbackSystem!.getUpdateQueueStatus()
        return NextResponse.json({
          queueStatus,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      case "feedback_report": {
        const startDate = searchParams.get("start")
        const endDate = searchParams.get("end")

        if (!startDate || !endDate) {
          return NextResponse.json({ error: "Missing start or end date parameters" }, { status: 400 })
        }

        const report = await feedbackSystem!.generateFeedbackReport({
          start: new Date(startDate),
          end: new Date(endDate),
        })

        return NextResponse.json({
          report,
          responseTime: `${Date.now() - startTime}ms`,
        })
      }

      default:
        return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 })
    }
  } catch (error) {
    console.error("Feedback API error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 500 },
    )
  }
}
