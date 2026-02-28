'use client'

import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function PlanningWelcomeSplash({ show }: { show: boolean }) {
  const router = useRouter()

  function handleClose() {
    router.replace('/planning')
  }

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) handleClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Start Your Retirement Journey</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-sm text-muted-foreground">
              <p>
                Welcome to the Planning page — this is the heart of WhenIm64.
              </p>
              <p>
                To get the most out of your projections, begin by filling in the{' '}
                <strong className="text-foreground">Plan Inputs</strong> section below. Enter your
                account balances, expected Social Security benefit, annual expenses, and other
                details about your situation.
              </p>
              <p>
                This information is used to help you make{' '}
                <strong className="text-foreground">optimal choices for your unique situation</strong>{' '}
                — from Roth conversion timing to Social Security claiming strategy. Everything can
                be adjusted at any time as your circumstances change.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose}>
            Take me to Plan Inputs
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
