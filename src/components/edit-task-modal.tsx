"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
} from "@mui/material"
import { format } from "date-fns"
import type { Task } from "./task-planner"

interface EditTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (updatedTask: { name: string; startDate: Date; endDate: Date }) => void
  task: Task
}

export function EditTaskModal({ isOpen, onClose, onSave, task }: EditTaskModalProps) {
  const [name, setName] = useState(task.name)
  const [startDate, setStartDate] = useState(format(task.startDate, "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(task.endDate, "yyyy-MM-dd"))
  const [error, setError] = useState("")

  useEffect(() => {
    if (isOpen) {
      setName(task.name)
      setStartDate(format(task.startDate, "yyyy-MM-dd"))
      setEndDate(format(task.endDate, "yyyy-MM-dd"))
      setError("")
    }
  }, [isOpen, task])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setError("Task name is required")
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start > end) {
      setError("Start date cannot be after end date")
      return
    }

    onSave({
      name: name.trim(),
      startDate: start,
      endDate: end,
    })
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="h2">
          Edit Task
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          <TextField
            label="Task Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter task name"
            autoFocus
            fullWidth
            variant="outlined"
          />

          <TextField
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            fullWidth
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
          />

          <TextField
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            fullWidth
            variant="outlined"
            InputLabelProps={{
              shrink: true,
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  )
}
