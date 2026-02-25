'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import HelpChat from './help-chat'

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-2xl h-[80vh]">
        <DialogHeader className="shrink-0">
          <DialogTitle>Retirement Help</DialogTitle>
          <DialogDescription>
            Ask anything about Medicare, Social Security, RMDs, or tax planning in retirement.
          </DialogDescription>
        </DialogHeader>
        <HelpChat className="flex-1 min-h-0" />
      </DialogContent>
    </Dialog>
  )
}
