import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import type { Project } from '../backend';

interface CalendarViewProps {
  projects: Project[];
  getCategoryColor: (index: number) => string;
  kategorien: string[];
}

export function CalendarView({ projects, getCategoryColor, kategorien }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  const formatDate = (timestamp?: bigint) => {
    if (!timestamp) return null;
    return new Date(Number(timestamp) / 1000000);
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  };

  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay() + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return {
      start,
      end,
      label: `${start.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    };
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

  const getWeekDays = (date: Date) => {
    const { start } = getWeekRange(date);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getProjectsForDay = (day: Date) => {
    return projects.filter(project => {
      // Skip projects without complete date range
      if (!project.startDate || !project.endDate) return false;
      
      const startDate = formatDate(project.startDate);
      const endDate = formatDate(project.endDate);
      
      if (!startDate || !endDate) return false;
      
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      return (
        (startDate <= dayEnd && endDate >= dayStart) ||
        (startDate >= dayStart && startDate <= dayEnd) ||
        (endDate >= dayStart && endDate <= dayEnd)
      );
    });
  };

  // Get projects without complete date range for separate display
  const undatedProjects = projects.filter(p => !p.startDate || !p.endDate);

  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = viewMode === 'month' ? getDaysInMonth(currentDate) : getWeekDays(currentDate);
  const weekRange = viewMode === 'week' ? getWeekRange(currentDate) : null;

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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar View
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 border rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('month')}
                  className="h-7 px-3"
                >
                  Month
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('week')}
                  className="h-7 px-3"
                >
                  Week
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={goToToday}>
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={goToPrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[200px] text-center font-semibold">
                  {viewMode === 'month' ? getMonthName(currentDate) : weekRange?.label}
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
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {days.map((day, index) => {
                const dayProjects = day ? getProjectsForDay(day) : [];
                const today = isToday(day);

                return (
                  <div
                    key={index}
                    className={`min-h-[120px] border rounded-lg p-2 ${
                      !day ? 'bg-muted/30' : today ? 'bg-primary/10 border-primary' : 'bg-card'
                    } ${viewMode === 'week' ? 'min-h-[200px]' : ''}`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-semibold mb-2 ${today ? 'text-primary' : ''}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayProjects.slice(0, viewMode === 'week' ? 10 : 3).map(project => {
                            const categoryIndex = kategorien.indexOf(project.kategorie);
                            
                            return (
                              <div
                                key={project.id}
                                className="text-xs p-1.5 rounded border truncate cursor-pointer hover:bg-black/30 dark:hover:bg-white/30 transition-colors"
                                style={{ 
                                  backgroundColor: `${project.color || '#3b82f6'}20`,
                                  borderColor: project.color || '#3b82f6'
                                }}
                                title={`${project.name} - ${project.kunde}`}
                              >
                                <div className="font-medium truncate">{project.name}</div>
                                {viewMode === 'week' && (
                                  <div className="text-[10px] opacity-75 truncate">{project.kunde}</div>
                                )}
                              </div>
                            );
                          })}
                          {dayProjects.length > (viewMode === 'week' ? 10 : 3) && (
                            <div className="text-[10px] text-muted-foreground text-center">
                              +{dayProjects.length - (viewMode === 'week' ? 10 : 3)} more
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

      {/* Undated Projects Section */}
      {undatedProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Undated Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {undatedProjects.map(project => {
                const categoryIndex = kategorien.indexOf(project.kategorie);
                
                return (
                  <div
                    key={project.id}
                    className="p-3 rounded-lg border"
                    style={{ 
                      backgroundColor: `${project.color || '#3b82f6'}10`,
                      borderColor: project.color || '#3b82f6'
                    }}
                  >
                    <div className="font-medium truncate">{project.name}</div>
                    <div className="text-sm text-muted-foreground truncate">{project.kunde}</div>
                    <div className="text-xs text-muted-foreground mt-1">{project.kategorie}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
