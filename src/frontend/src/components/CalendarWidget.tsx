import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { Project } from '../backend';
import type { TaskV2 } from '../hooks/useQueries';

interface CalendarWidgetProps {
  projects: Project[];
  tasks: TaskV2[];
}

interface CalendarEvent {
  id: string;
  title: string;
  type: 'project-start' | 'project-end' | 'task-due';
  date: Date;
  color?: string;
  projectId?: string;
  taskId?: string;
}

export function CalendarWidget({ projects, tasks }: CalendarWidgetProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (timestamp?: bigint) => {
    if (!timestamp) return null;
    return new Date(Number(timestamp) / 1000000);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: (Date | null)[] = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    // Add project start/end events
    projects.forEach(project => {
      const startDate = formatDate(project.startDate);
      const endDate = formatDate(project.endDate);

      if (startDate && startDate >= dayStart && startDate <= dayEnd) {
        events.push({
          id: `${project.id}-start`,
          title: `${project.name} (Start)`,
          type: 'project-start',
          date: startDate,
          color: project.color,
          projectId: project.id,
        });
      }

      if (endDate && endDate >= dayStart && endDate <= dayEnd) {
        events.push({
          id: `${project.id}-end`,
          title: `${project.name} (Ende)`,
          type: 'project-end',
          date: endDate,
          color: project.color,
          projectId: project.id,
        });
      }
    });

    // Add task due date events
    tasks.forEach(task => {
      if (task.status === 'Erledigt') return; // Skip completed tasks
      
      const dueDate = formatDate(task.faelligkeit);
      if (dueDate && dueDate >= dayStart && dueDate <= dayEnd) {
        events.push({
          id: `${task.id}-due`,
          title: task.titel,
          type: 'task-due',
          date: dueDate,
          taskId: task.id,
        });
      }
    });

    return events;
  };

  const goToPrevious = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNext = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.projectId) {
      // Navigate to project details
      const navEvent = new CustomEvent('navigate', { 
        detail: { page: 'roadmap', projectId: event.projectId } 
      });
      window.dispatchEvent(navEvent);
    } else if (event.taskId) {
      // Navigate to tasks page
      const navEvent = new CustomEvent('navigate', { 
        detail: { page: 'tasks', taskId: event.taskId } 
      });
      window.dispatchEvent(navEvent);
    }
  };

  const days = getDaysInMonth(currentDate);

  const isToday = (day: Date | null) => {
    if (!day) return false;
    const today = new Date();
    return (
      day.getDate() === today.getDate() &&
      day.getMonth() === today.getMonth() &&
      day.getFullYear() === today.getFullYear()
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Kalender
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={goToToday}>
              Heute
            </Button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[180px] text-center font-semibold">
                {getMonthName(currentDate)}
              </div>
              <Button size="sm" variant="outline" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              const today = isToday(day);

              return (
                <div
                  key={index}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    !day ? 'bg-muted/30' : today ? 'bg-primary/10 border-primary' : 'bg-card'
                  }`}
                >
                  {day && (
                    <>
                      <div className={`text-sm font-semibold mb-2 ${today ? 'text-primary' : ''}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className="text-xs p-1.5 rounded border truncate cursor-pointer hover:bg-black/30 dark:hover:bg-white/30 transition-colors"
                            style={{ 
                              backgroundColor: event.type === 'task-due' 
                                ? '#f59e0b20' 
                                : `${event.color || '#3b82f6'}20`,
                              borderColor: event.type === 'task-due' 
                                ? '#f59e0b' 
                                : event.color || '#3b82f6'
                            }}
                            title={event.title}
                            onClick={() => handleEventClick(event)}
                          >
                            <div className="font-medium truncate">
                              {event.type === 'task-due' && '📋 '}
                              {event.type === 'project-start' && '🚀 '}
                              {event.type === 'project-end' && '🏁 '}
                              {event.title}
                            </div>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[10px] text-muted-foreground text-center">
                            +{dayEvents.length - 2} weitere
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
