"use client"

import type React from "react"
import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import {
  Box,
  Typography,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Paper,
  IconButton,
  InputAdornment,
  Collapse,
  Menu,
  MenuItem,
} from "@mui/material"

// Use Grid (the recommended Grid in newer MUI versions)
import Grid  from "@mui/material/Grid"
import { ThemeProvider, createTheme } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { TaskCreationModal } from "./task-creation-modal"
import { EditTaskModal } from "./edit-task-modal"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval,
  addWeeks,
} from "date-fns"
import { ChevronLeft, ChevronRight, Search, FilterList } from "@mui/icons-material"

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
    success: {
      main: "#2e7d32",
    },
    warning: {
      main: "#ed6c02",
    },
  },
})

export interface Task {
  id: string
  name: string
  startDate: Date
  endDate: Date
  category: "To Do" | "In Progress" | "Review" | "Completed"
}

const getCategoryColor = (category: Task["category"]) => {
  switch (category) {
    case "To Do":
      return {
        bgcolor: "primary.main",
        color: "primary.contrastText",
      }
    case "In Progress":
      return {
        bgcolor: "warning.main",
        color: "warning.contrastText",
      }
    case "Review":
      return {
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
      }
    case "Completed":
      return {
        bgcolor: "success.main",
        color: "success.contrastText",
      }
    default:
      return {
        bgcolor: "grey.500",
        color: "grey.contrastText",
      }
  }
}

const getCategoryChipColor = (category: Task["category"]) => {
  switch (category) {
    case "To Do":
      return "#1976d2"
    case "In Progress":
      return "#ed6c02"
    case "Review":
      return "#dc004e"
    case "Completed":
      return "#2e7d32"
    default:
      return "#757575"
  }
}

const loadTasksFromStorage = (): Task[] => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem("task-planner-tasks")
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return parsed.map((task: any) => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate),
    }))
  } catch (error) {
    console.error("Failed to load tasks from localStorage:", error)
    return []
  }
}

// const saveTasksToStorage = (tasks: Task[]) => {
//   if (typeof window === "undefined") return
//   try {
//     localStorage.setItem("task-planner-tasks", JSON.stringify(tasks))
//   } catch (error) {
//     console.error("Failed to save tasks to localStorage:", error)
//   }
// }

export function TaskPlanner() {
  const [currentViewDate, setCurrentViewDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date; end: Date } | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    task: Task | null
  }>({ visible: false, x: 0, y: 0, task: null })

  const [editModal, setEditModal] = useState<{
    visible: boolean
    task: Task | null
  }>({ visible: false, task: null })

  useEffect(() => {
    const loadedTasks = loadTasksFromStorage()
    setTasks(loadedTasks)
  }, [])

//   useEffect(() => {
//     if (tasks.length > 0 || (typeof window !== "undefined" && localStorage.getItem("task-planner-tasks"))) {
//       saveTasksToStorage(tasks)
//     }
//   }, [tasks])

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilters, setCategoryFilters] = useState<Set<Task["category"]>>(
    new Set(["To Do", "In Progress", "Review", "Completed"]),
  )
  const [timeFilter, setTimeFilter] = useState<"all" | "1week" | "2weeks" | "3weeks">("all")
  const [showFilters, setShowFilters] = useState(false)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<Date | null>(null)
  const [dragEnd, setDragEnd] = useState<Date | null>(null)

  const [resizingTask, setResizingTask] = useState<Task | null>(null)
  // removed unused `resizeMode` state to avoid unused-variable TS warnings

  const [previewTask, setPreviewTask] = useState<Task | null>(null)

  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [dragMode, setDragMode] = useState<"create" | "move" | "resize" | null>(null)
  const [dragOffset, setDragOffset] = useState({ days: 0 })

  const monthStart = startOfMonth(currentViewDate)
  const monthEnd = endOfMonth(currentViewDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)

  const days: { date: number; fullDate: Date; isCurrentMonth: boolean }[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push({
      date: day.getDate(),
      fullDate: new Date(day),
      isCurrentMonth: isSameMonth(day, currentViewDate),
    })
    day = addDays(day, 1)
  }

  const currentUpdatedTaskRef = useRef<Task | null>(null)

  const filteredTasks = useMemo(() => {
    let filtered = tasks

    if (searchTerm.trim()) {
      filtered = filtered.filter((task) => task.name.toLowerCase().includes(searchTerm.toLowerCase()))
    }

    filtered = filtered.filter((task) => categoryFilters.has(task.category))

    filtered = filtered.filter((task) => {
      return task.startDate <= calendarEnd && task.endDate >= calendarStart
    })

    if (timeFilter !== "all") {
      const now = new Date()
      const weeks = timeFilter === "1week" ? 1 : timeFilter === "2weeks" ? 2 : 3
      const timeLimit = addWeeks(now, weeks)

      filtered = filtered.filter((task) => {
        return (
          isWithinInterval(task.startDate, { start: now, end: timeLimit }) ||
          isWithinInterval(task.endDate, { start: now, end: timeLimit }) ||
          (task.startDate <= now && task.endDate >= timeLimit)
        )
      })
    }

    return filtered
  }, [tasks, searchTerm, categoryFilters, timeFilter, calendarStart, calendarEnd])

  const toggleCategoryFilter = (category: Task["category"]) => {
    setCategoryFilters((prev) => {
      const newFilters = new Set(prev)
      if (newFilters.has(category)) {
        newFilters.delete(category)
      } else {
        newFilters.add(category)
      }
      return newFilters
    })
  }

  // const exportTasks = () => {
  //   const dataStr = JSON.stringify(tasks, null, 2)
  //   const dataBlob = new Blob([dataStr], { type: "application/json" })
  //   const url = URL.createObjectURL(dataBlob)
  //   const link = document.createElement("a")
  //   link.href = url
  //   link.download = `tasks-${format(new Date(), "yyyy-MM-dd")}.json`
  //   link.click()
  //   URL.revokeObjectURL(url)
  // }

  // const importTasks = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0]
  //   if (!file) return

  //   const reader = new FileReader()
  //   reader.onload = (e) => {
  //     try {
  //       const imported = JSON.parse(e.target?.result as string)
  //       const validTasks = imported
  //         .map((task: any) => ({
  //           ...task,
  //           startDate: new Date(task.startDate),
  //           endDate: new Date(task.endDate),
  //         }))
  //         .filter((task: any) => task.id && task.name && task.startDate && task.endDate && task.category)

  //       setTasks((prev) => [...prev, ...validTasks])
  //     } catch (error) {
  //       console.error("Failed to import tasks:", error)
  //       alert("Failed to import tasks. Please check the file format.")
  //     }
  //   }
  //   reader.readAsText(file)
  //   // clear the input so same file can be re-imported if needed
  //   if (event.target) event.target.value = ""
  // }

  const goToPreviousMonth = () => {
    setCurrentViewDate((prev) => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setCurrentViewDate((prev) => addMonths(prev, 1))
  }

  const goToToday = () => {
    setCurrentViewDate(new Date())
  }

  const handleMouseUp = useCallback(() => {
    if (dragMode === "create" && isDragging && dragStart && dragEnd) {
      const start = dragStart <= dragEnd ? dragStart : dragEnd
      const end = dragStart <= dragEnd ? dragEnd : dragStart
      setSelectedDateRange({ start, end })
      setShowTaskModal(true)
    } else if (dragMode === "move" && draggedTask && previewTask) {
      // previewTask is checked by the if condition
      setTasks((prev) => prev.map((t) => (t.id === draggedTask.id ? (previewTask as Task) : t)))
    }

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
    setDraggedTask(null)
    setDragMode(null)
    setPreviewTask(null)
    setDragOffset({ days: 0 })
  }, [dragMode, isDragging, dragStart, dragEnd, draggedTask, previewTask])

  // const isDateInSelection = useCallback(
  //   (date: Date) => {
  //     if (!dragStart || !dragEnd || dragMode !== "create") return false
  //     const start = dragStart <= dragEnd ? dragStart : dragEnd
  //     const end = dragStart <= dragEnd ? dragEnd : dragStart
  //     return date >= start && date <= end
  //   },
  //   [dragStart, dragEnd, dragMode],
  // )

  const handleMouseDown = useCallback(
    (date: Date, e: React.MouseEvent) => {
      if (resizingTask || draggedTask || e.button === 2) return
      e.preventDefault()
      setDragStart(date)
      setDragEnd(date)
      setIsDragging(true)
      setDragMode("create")
    },
    [resizingTask, draggedTask],
  )

  const handleMouseEnter = useCallback(
    (date: Date) => {
      if (!isDragging) return

      if (dragMode === "create" && dragStart) {
        setDragEnd(date)
      } else 
      if (dragMode === "move" && draggedTask) {
        const daysDiff = Math.floor((date.getTime() - dragStart!.getTime()) / (1000 * 60 * 60 * 24))
        const newStartDate = new Date(draggedTask.startDate)
        const newEndDate = new Date(draggedTask.endDate)

        newStartDate.setDate(newStartDate.getDate() + daysDiff - dragOffset.days)
        newEndDate.setDate(newEndDate.getDate() + daysDiff - dragOffset.days)

        setPreviewTask({
          ...draggedTask,
          startDate: newStartDate,
          endDate: newEndDate,
        })
      }
    },
    [isDragging, dragMode, dragStart, draggedTask, dragOffset],
  )

  const handleTaskDragStart = useCallback(
    (task: Task, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const calendarGrid = document.querySelector("[data-calendar-grid]")
      if (!calendarGrid) return

      const gridRect = calendarGrid.getBoundingClientRect()
      const cellWidth = gridRect.width / 7
      const clickX = e.clientX - gridRect.left
      const clickCol = Math.floor(clickX / cellWidth)

      const taskStartIndex = days.findIndex((d) => isSameDay(d.fullDate, task.startDate))
      const taskStartCol = taskStartIndex % 7

      setDraggedTask(task)
      setDragMode("move")
      setIsDragging(true)
      setDragStart(task.startDate)
      setDragOffset({ days: clickCol - taskStartCol })
      setPreviewTask(task)
    },
    [days],
  )

  const handleResizeStart = useCallback(
    (task: Task, mode: "start" | "end", event: React.MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setResizingTask(task)
      setPreviewTask(task)
      setDragMode("resize")
      currentUpdatedTaskRef.current = task

      const handleMouseMove = (e: MouseEvent) => {
        const calendarGrid = document.querySelector("[data-calendar-grid]")
        if (!calendarGrid) return

        const rect = calendarGrid.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const cellWidth = rect.width / 7
        const cellHeight = rect.height / Math.ceil(days.length / 7)

        const col = Math.floor(x / cellWidth)
        const row = Math.floor(y / cellHeight)
        const dayIndex = row * 7 + col

        if (dayIndex >= 0 && dayIndex < days.length) {
          const targetDate = days[dayIndex].fullDate

          if (mode === "start") {
            if (targetDate <= task.endDate) {
              currentUpdatedTaskRef.current = {
                ...task,
                startDate: targetDate,
              }
              setPreviewTask(currentUpdatedTaskRef.current)
            }
          } else {
            if (targetDate >= task.startDate) {
              currentUpdatedTaskRef.current = {
                ...task,
                endDate: targetDate,
              }
              setPreviewTask(currentUpdatedTaskRef.current)
            }
            
          }
        }
      }

      const handleMouseUp = () => {
        // update the tasks array with the edited task (if any)
        const updated = currentUpdatedTaskRef.current
        if (updated) {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
        }

        setResizingTask(null)
        setPreviewTask(null)
        setDragMode(null)
        currentUpdatedTaskRef.current = null
        document.removeEventListener("mousemove", handleMouseMove)
        document.removeEventListener("mouseup", handleMouseUp)
      }

      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    },
    [days],
  )

  const handleCloseModal = useCallback(() => {
    setShowTaskModal(false)
    setSelectedDateRange(null)
  }, [])

  const handleCreateTask = useCallback(
    (taskData: { name: string; category: Task["category"] }) => {
      if (!selectedDateRange) return

      const newTask: Task = {
        id: Date.now().toString(),
        name: taskData.name,
        startDate: selectedDateRange.start,
        endDate: selectedDateRange.end,
        category: taskData.category,
      }

      setTasks((prev) => [...prev, newTask])
      setShowTaskModal(false)
      setSelectedDateRange(null)
    },
    [selectedDateRange],
  )

  const getTaskStackingInfo = useCallback(
    (ts: Task[]) => {
      const stackingInfo: { [taskId: string]: { stackIndex: number; totalStacks: number } } = {}

      const dateRangeGroups: { [key: string]: Task[] } = {}

      ts.forEach((task) => {
        const startIndex = days.findIndex((d) => isSameDay(d.fullDate, task.startDate))
        const endIndex = days.findIndex((d) => isSameDay(d.fullDate, task.endDate))

        if (startIndex === -1 || endIndex === -1) return

        for (let i = startIndex; i <= endIndex; i++) {
          const dateKey = days[i].fullDate.toDateString()
          if (!dateRangeGroups[dateKey]) {
            dateRangeGroups[dateKey] = []
          }
          if (!dateRangeGroups[dateKey].find((t) => t.id === task.id)) {
            dateRangeGroups[dateKey].push(task)
          }
        }
      })

      ts.forEach((task) => {
        const startIndex = days.findIndex((d) => isSameDay(d.fullDate, task.startDate))
        if (startIndex === -1) return

        const taskStartDate = days[startIndex].fullDate.toDateString()
        const overlappingTasks = dateRangeGroups[taskStartDate] || []

        overlappingTasks.sort((a, b) => {
          const dateCompare = a.startDate.getTime() - b.startDate.getTime()
          return dateCompare !== 0 ? dateCompare : a.id.localeCompare(b.id)
        })

        const maxOverlaps = overlappingTasks.length
        const taskStackIndex = overlappingTasks.findIndex((t) => t.id === task.id)

        stackingInfo[task.id] = {
          stackIndex: taskStackIndex,
          totalStacks: maxOverlaps,
        }
      })

      return stackingInfo
    },
    [days],
  )

  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }, [])

  // getRowHeights needs filteredTasks; we compute on demand
  const getRowHeights = useCallback(() => {
    const stackingInfo = getTaskStackingInfo(filteredTasks)
    const rowHeights: number[] = []

    const numWeeks = Math.ceil(days.length / 7)

    for (let row = 0; row < numWeeks; row++) {
      let maxStacksInRow = 1

      filteredTasks.forEach((task) => {
        const startIndex = days.findIndex((d) => isSameDay(d.fullDate, task.startDate))
        const endIndex = days.findIndex((d) => isSameDay(d.fullDate, task.endDate))

        if (startIndex !== -1 && endIndex !== -1) {
          const startRow = Math.floor(startIndex / 7)
          const endRow = Math.floor(endIndex / 7)

          if (row >= startRow && row <= endRow) {
            const { totalStacks } = stackingInfo[task.id] || { totalStacks: 1 }
            maxStacksInRow = Math.max(maxStacksInRow, totalStacks)
          }
        }
      })

      const baseHeight = 100
      const extraHeight = Math.max(0, (maxStacksInRow - 1) * 26)
      rowHeights.push(baseHeight + extraHeight)
    }

    return rowHeights
  }, [filteredTasks, days, getTaskStackingInfo])

  const rowHeights = getRowHeights()

  const handleTaskRightClick = useCallback((task: Task, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      task: task,
    })
  }, [])

  const handleEditTask = useCallback(() => {
    if (contextMenu.task) {
      setEditModal({ visible: true, task: contextMenu.task })
    }
    setContextMenu({ visible: false, x: 0, y: 0, task: null })
  }, [contextMenu.task])

  const handleDeleteTask = useCallback(() => {
    if (contextMenu.task) {
      deleteTask(contextMenu.task.id)
    }
    setContextMenu({ visible: false, x: 0, y: 0, task: null })
  }, [contextMenu.task, deleteTask])

  const handleSaveEditedTask = useCallback(
    (updatedTask: { name: string; startDate: Date; endDate: Date }) => {
      if (editModal.task) {
        const newTask: Task = {
          id: Date.now().toString(),
          name: updatedTask.name,
          startDate: updatedTask.startDate,
          endDate: updatedTask.endDate,
          category: editModal.task.category,
        }

        setTasks((prev) => prev.filter((task) => task.id !== editModal.task!.id).concat(newTask))
      }
      setEditModal({ visible: false, task: null })
    },
    [editModal.task],
  )

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0, task: null })
    }

    if (contextMenu.visible) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [contextMenu.visible])

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Grid width={"100%"} sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", color: "text.primary" }}>
              {format(currentViewDate, "MMMM yyyy")} Task Planner
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton
                onClick={goToPreviousMonth}
                size="small"
                sx={{ "&:hover": { bgcolor: "grey.100" } }}
                title="Previous month"
              >
                <ChevronLeft />
              </IconButton>
              <Button onClick={goToToday} variant="contained" size="small" sx={{ minWidth: "auto", px: 2 }}>
                Today
              </Button>
              <IconButton
                onClick={goToNextMonth}
                size="small"
                sx={{ "&:hover": { bgcolor: "grey.100" } }}
                title="Next month"
              >
                <ChevronRight />
              </IconButton>
            </Box>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <TextField
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ flexGrow: 1, maxWidth: 400 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "text.secondary", fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<FilterList />}
                size="small"
              >
                Filters
              </Button>
              {/* <Button
                onClick={exportTasks}
                variant="outlined"
                startIcon={<Download />}
                size="small"
                color="success"
                title="Export tasks"
              >
                Export
              </Button>
              <Button
                component="label"
                variant="outlined"
                startIcon={<Upload />}
                size="small"
                color="secondary"
                sx={{ cursor: "pointer" }}
              >
                Import
                <input type="file" accept=".json" onChange={importTasks} hidden />
              </Button> */}
            </Box>

            <Collapse in={showFilters}>
              <Paper sx={{ p: 3, bgcolor: "grey.50", border: 1, borderColor: "grey.200" }}>
                <Grid container spacing={4}>
                  <div style={{ width:"40%"}}>
                    <FormLabel component="legend" sx={{ mb: 2, fontWeight: "medium" }}>
                      Categories
                    </FormLabel>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {(["To Do", "In Progress", "Review", "Completed"] as const).map((category) => (
                        <Box key={category} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={categoryFilters.has(category)}
                                onChange={() => toggleCategoryFilter(category)}
                                size="small"
                              />
                            }
                            label={category}
                            sx={{ mr: 1 }}
                          />
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: getCategoryChipColor(category),
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </div>

                  <div style={{ width:"40%"}}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" sx={{ mb: 2, fontWeight: "medium" }}>
                        Time Range
                      </FormLabel>
                      <RadioGroup value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}>
                        {[
                          { value: "all", label: "All tasks" },
                          { value: "1week", label: "Tasks within 1 week" },
                          { value: "2weeks", label: "Tasks within 2 weeks" },
                          { value: "3weeks", label: "Tasks within 3 weeks" },
                        ].map((option) => (
                          <FormControlLabel key={option.value} value={option.value} control={<Radio size="small" />} label={option.label} />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  </div>
                </Grid>
              </Paper>
            </Collapse>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Drag across dates to create tasks. Drag task body to move. Drag task edges to resize.
            {filteredTasks.length !== tasks.length && (
              <Typography component="span" sx={{ ml: 1, color: "primary.main" }}>
                Showing {filteredTasks.length} of {tasks.length} tasks
              </Typography>
            )}
          </Typography>
        </Box>

        <Paper sx={{ border: 1, borderColor: "grey.200", overflow: "hidden" }}>
          <Grid container sx={{ bgcolor: "grey.50", borderBottom: 1, borderColor: "grey.200" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <Grid size={{ xs:12/7 }} key={d} style={{ padding: 1.5, textAlign: "center" }}>
                <Typography variant="body2" sx={{ fontWeight: "medium", color: "text.secondary" }}>
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Box
            data-calendar-grid
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false)
              setDragStart(null)
              setDragEnd(null)
              setDraggedTask(null)
              setDragMode(null)
              setPreviewTask(null)
              setDragOffset({ days: 0 })
            }}
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 0,
              position: "relative",
            }}
          >
            {days.map((d, index) => {
              // const isSelected = isDateInSelection(d.fullDate)
              const rowIndex = Math.floor(index / 7)
              const cellHeight = rowHeights[rowIndex] || 100

              return (
                <Box
                  key={index}
                  onMouseDown={(e) => handleMouseDown(d.fullDate, e)}
                  onMouseEnter={() => handleMouseEnter(d.fullDate)}
                  id={`${d.fullDate}`}
                  sx={{
                    borderRight: 1,
                    borderBottom: 1,
                    borderColor: "grey.200",
                    p: 1,
                    position: "relative",
                    cursor: "pointer",
                    height: `${cellHeight}px`,
                    bgcolor: !d.isCurrentMonth ? "lightgrey" : "white",
                    color: !d.isCurrentMonth ?  isToday(d.fullDate) ? "white" : "text.disabled" : isToday(d.fullDate) ? "white" : "text.primary",
                    "&:hover": {
                      bgcolor: "grey.50",
                      border: "2px solid blue"
                    },
                  }}
                >
                  
                    <div style={{display:"flex", alignItems:"center",fontWeight: isToday(d.fullDate) ? "bold" : "medium", backgroundColor: isToday(d.fullDate) ? "blue" :"transparent", width:"30px", height:"30px", borderRadius:"50%", textAlign:"center", justifyContent:"center"}}>{d.date}</div>
                  
                </Box>
              )
            })}

            {filteredTasks.map((task) => {
              const displayTask =
                previewTask && (task.id === resizingTask?.id || task.id === draggedTask?.id) ? previewTask : task

              const taskStartDate = displayTask.startDate < calendarStart ? calendarStart : displayTask.startDate
              const taskEndDate = displayTask.endDate > calendarEnd ? calendarEnd : displayTask.endDate

              const startIndex = days.findIndex((dayItem) => isSameDay(dayItem.fullDate, taskStartDate))
              const endIndex = days.findIndex((dayItem) => isSameDay(dayItem.fullDate, taskEndDate))

              if (startIndex === -1 || endIndex === -1) return null

              const startRow = Math.floor(startIndex / 7)
              const startCol = startIndex % 7
              const endRow = Math.floor(endIndex / 7)
              const endCol = endIndex % 7

              const stackingInfo = getTaskStackingInfo(filteredTasks)
              const { stackIndex } = stackingInfo[task.id] || { stackIndex: 0, totalStacks: 1 }
              const taskHeight = 24
              const stackOffset = stackIndex * (taskHeight + 2)

              const taskSegments: React.ReactNode[] = []

              const getCumulativeHeight = (rowIndex: number) => {
                return rowHeights.slice(0, rowIndex).reduce((sum, height) => sum + height, 0)
              }

              const isStartDateVisible = days.some((dd) => isSameDay(dd.fullDate, task.startDate))
              const isEndDateVisible = days.some((dd) => isSameDay(dd.fullDate, task.endDate))

              for (let row = startRow; row <= endRow; row++) {
                const segmentStartCol = row === startRow ? startCol : 0
                const segmentEndCol = row === endRow ? endCol : 6

                const segmentWidth = ((segmentEndCol - segmentStartCol + 1) / 7) * 100
                const segmentLeft = (segmentStartCol / 7) * 100
                const segmentTop = getCumulativeHeight(row) + 40 + stackOffset

                taskSegments.push(
                  <Box
                    key={`${task.id}-row-${row}`}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      position: "absolute",
                      zIndex: 10,
                      cursor: "move",
                      height: `${taskHeight}px`,
                      minWidth: "60px",
                      borderRadius: 1,
                      boxShadow: 1,
                      ...getCategoryColor(displayTask.category),
                      ...(draggedTask?.id === task.id
                        ? { opacity: 0.5 }
                        : resizingTask?.id === task.id
                        ? { opacity: 0.7 }
                        : {
                            "&:hover": {
                              opacity: 0.9,
                              boxShadow: 2,
                            },
                          }),
                    }}
                    style={{
                      left: `${segmentLeft}%`,
                      top: `${segmentTop}px`,
                      width: `${segmentWidth}%`,
                    }}
                    title={`${displayTask.name} (${displayTask.category})`}
                    onMouseDown={(e) => handleTaskDragStart(task, e)}
                    onContextMenu={(e) => handleTaskRightClick(task, e)}
                  >
                    {row === startRow && isStartDateVisible && (
                      <Box
                        sx={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 8,
                          bgcolor: "rgba(0, 0, 0, 0.3)",
                          "&:hover": {
                            bgcolor: "rgba(0, 0, 0, 0.5)",
                            width: 10,
                          },
                          cursor: "ew-resize",
                          borderRadius: "4px 0 0 4px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseDown={(e) => handleResizeStart(task, "start", e)}
                        title="Drag to adjust start date"
                      >
                        <Box sx={{ width: 2, height: 8, bgcolor: "white", borderRadius: "1px", opacity: 0.8 }} />
                      </Box>
                    )}

                    {row === startRow && (
                      <Typography
                        variant="body2"
                        sx={{
                          px: 1.5,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "0.75rem",
                          fontWeight: "medium",
                          userSelect: "none",
                        }}
                      >
                        {displayTask.name}
                      </Typography>
                    )}

                    {row === endRow && isEndDateVisible && (
                      <Box
                        sx={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 8,
                          bgcolor: "rgba(0, 0, 0, 0.3)",
                          "&:hover": {
                            bgcolor: "rgba(0, 0, 0, 0.5)",
                            width: 10,
                          },
                          cursor: "ew-resize",
                          borderRadius: "0 4px 4px 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
                        }}
                        onMouseDown={(e) => handleResizeStart(task, "end", e)}
                        title="Drag to adjust end date"
                      >
                        <Box sx={{ width: 2, height: 8, bgcolor: "white", borderRadius: "1px", opacity: 0.8 }} />
                      </Box>
                    )}
                  </Box>,
                )
              }

              return taskSegments
            })}
          </Box>
        </Paper>

        <Menu
          open={contextMenu.visible}
          onClose={() => setContextMenu({ visible: false, x: 0, y: 0, task: null })}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu.visible ? { top: contextMenu.y, left: contextMenu.x } : undefined}
        >
          <MenuItem onClick={handleEditTask}>Edit</MenuItem>
          <MenuItem onClick={handleDeleteTask} sx={{ color: "error.main" }}>
            Delete
          </MenuItem>
        </Menu>

        {showTaskModal && selectedDateRange && (
          <TaskCreationModal
            isOpen={showTaskModal}
            onClose={handleCloseModal}
            onCreateTask={handleCreateTask}
            dateRange={selectedDateRange}
          />
        )}

        {editModal.visible && editModal.task && (
          <EditTaskModal
            isOpen={editModal.visible}
            onClose={() => setEditModal({ visible: false, task: null })}
            onSave={handleSaveEditedTask}
            task={editModal.task}
          />
        )}
      </Grid>
    </ThemeProvider>
  )
}

export default TaskPlanner
