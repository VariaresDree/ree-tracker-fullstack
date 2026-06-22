import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../services/dbQueries';
import toast from 'react-hot-toast';

export default function StrategicPlannerTab({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchTasks = useCallback(async () => {
    try {
      const data = await apiRequest('/api/user/tasks');
      setTasks(data?.items || []);
    } catch (err) {
      toast.error("Failed to load planner tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) fetchTasks();
  }, [currentUser, fetchTasks]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const data = await apiRequest('/api/user/tasks', 'POST', {
        text: newTask,
        dueDate: newDueDate || null
      });
      if (data?.task) setTasks(prev => [data.task, ...prev]);
      setNewTask('');
      setNewDueDate('');
    } catch (err) {
      toast.error("Failed to create task.");
    }
  };

  const toggleTask = async (task) => {
    const updated = !task.completed;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: updated } : t));
    try {
      await apiRequest(`/api/user/tasks/${task.id}`, 'PUT', { completed: updated });
    } catch (err) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !updated } : t));
      toast.error("Failed to update task.");
    }
  };

  const deleteTask = async (id) => {
    const prev = tasks;
    setTasks(t => t.filter(x => x.id !== id));
    try {
      await apiRequest(`/api/user/tasks/${id}`, 'DELETE');
    } catch (err) {
      setTasks(prev);
      toast.error("Failed to delete task.");
    }
  };

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const renderCalendar = () => {
      const daysInMonth = getDaysInMonth(currentDate);
      const firstDay = getFirstDayOfMonth(currentDate);
      const today = new Date();
      const blanks = Array(firstDay).fill(null);
      const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

      return (
          <div className="bg-bg border border-border2 p-4 rounded-xl shadow-inner">
              <div className="flex justify-between items-center mb-4">
                  <button onClick={prevMonth} className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer">&lt;</button>
                  <div className="font-bold text-sm uppercase tracking-widest text-textMain">
                      {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                  </div>
                  <button onClick={nextMonth} className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer">&gt;</button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[0.65rem] font-bold text-muted mb-2 uppercase">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                  {blanks.map((_, i) => <div key={`blank-${i}`} className="p-2"></div>)}
                  {days.map(d => {
                      const isToday = d === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                      const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const hasTask = tasks.some(t => t.dueDate === dateString && !t.completed);

                      return (
                          <div key={d} className={`relative p-1.5 rounded-lg text-xs transition-colors ${isToday ? 'bg-reeBlue text-white font-black shadow-md' : 'text-textMain hover:bg-surface2 cursor-pointer'}`}>
                              {d}
                              {hasTask && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-reeAmber rounded-full"></span>}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const sortedTasks = [...tasks].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex flex-col gap-6 lg:col-span-1">
            {renderCalendar()}
        </div>

        <div className="bg-surface border border-border2 rounded-xl shadow-sm flex flex-col lg:col-span-2 p-6 md:p-8 h-[600px]">
            <div className="mb-6">
                <h2 className="text-2xl font-black text-textMain tracking-tight">Active Objectives</h2>
                <p className="text-sm text-muted2 mt-1">Temporal task tracking. Prioritize red and amber objectives.</p>
            </div>

            <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="Designate new objective..."
                    className="flex-1 bg-bg border border-border2 text-textMain p-3.5 rounded-xl text-sm outline-none focus:border-reeBlue transition-colors shadow-inner"
                />
                <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="bg-bg border border-border2 text-muted p-3.5 rounded-xl text-sm outline-none focus:border-reeBlue transition-colors shadow-inner w-full sm:w-auto cursor-pointer"
                />
                <button type="submit" disabled={!newTask.trim()} className="px-6 py-3.5 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors shadow-md disabled:opacity-50 cursor-pointer">
                    Add
                </button>
            </form>

            <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <span className="telemetry-spinner inline-block mr-2"></span>
                        <span className="text-muted2 text-sm font-mono uppercase tracking-widest">Loading Objectives...</span>
                    </div>
                ) : sortedTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed border-border2 rounded-xl p-8 opacity-70">
                        <span className="text-4xl mb-3">🎯</span>
                        <span className="text-sm font-bold text-textMain">Tracker is Empty</span>
                        <span className="text-xs text-muted font-mono mt-1">You are clear to engage in free study or set new directives.</span>
                    </div>
                ) : (
                    sortedTasks.map(task => {
                        const today = new Date().toISOString().split('T')[0];
                        let statusColor = 'border-border2';
                        let dateBadge = null;

                        if (!task.completed && task.dueDate) {
                            if (task.dueDate < today) {
                                statusColor = 'border-reeRed/50 bg-reeRed/5';
                                dateBadge = <span className="text-[0.6rem] font-bold uppercase tracking-widest text-reeRed bg-reeRed/10 px-2 py-0.5 rounded ml-2">Overdue</span>;
                            } else if (task.dueDate === today) {
                                statusColor = 'border-reeAmber/50 bg-reeAmber/5';
                                dateBadge = <span className="text-[0.6rem] font-bold uppercase tracking-widest text-reeAmber bg-reeAmber/10 px-2 py-0.5 rounded ml-2">Today</span>;
                            } else {
                                dateBadge = <span className="text-[0.6rem] font-mono text-muted2 ml-2">{task.dueDate}</span>;
                            }
                        }

                        return (
                            <div key={task.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all group ${task.completed ? 'bg-surface2/50 border-border2 opacity-60' : `bg-surface hover:border-reeBlue/30 shadow-sm ${statusColor}`}`}>
                                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                    <button onClick={() => toggleTask(task)} className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${task.completed ? 'bg-reeGreen border-reeGreen text-bg shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-bg border-border2 text-transparent hover:border-reeGreen'}`}>✓</button>
                                    <div className="flex flex-col truncate">
                                        <span className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted' : 'text-textMain'}`}>{task.text}</span>
                                        {!task.completed && dateBadge}
                                    </div>
                                </div>
                                <button onClick={() => deleteTask(task.id)} className="text-muted hover:text-reeRed p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">✕</button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    </div>
  );
}
