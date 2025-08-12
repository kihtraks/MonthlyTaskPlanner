"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material"
import { Close } from "@mui/icons-material"
import type { Task } from "./task-planner"

interface TaskCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateTask: (taskData: { name: string; category: Task["category"] }) => void
  dateRange: { start: Date; end: Date } | null
}

const CATEGORIES = ["To Do", "In Progress", "Review", "Completed"] as const

export function TaskCreationModal({ isOpen, onClose, onCreateTask, dateRange }: TaskCreationModalProps) {
  const [taskName, setTaskName] = useState("")
  const [category, setCategory] = useState<Task["category"]>("To Do")

  useEffect(() => {
    if (isOpen) {
      setTaskName("")
      setCategory("To Do")
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (taskName.trim()) {
      onCreateTask({ name: taskName.trim(), category })
    }
  }

  const formatDateRange = () => {
    if (!dateRange) return ""

    const start = dateRange.start.toLocaleDateString()
    const end = dateRange.end.toLocaleDateString()

    if (start === end) {
      return start
    }
    return `${start} - ${end}`
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography variant="h6" component="h2">
          Create New Task
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary"sx={{ fontWeight: "medium" }}>
                Date: {formatDateRange()}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Task Name"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="Enter task name..."
            autoFocus
            required
            fullWidth
            variant="outlined"
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value as Task["category"])}>
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} variant="outlined" sx={{ mr: 1 }}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!taskName.trim()}>
          Create Task
        </Button>
      </DialogActions>
    </Dialog>
  )
}
