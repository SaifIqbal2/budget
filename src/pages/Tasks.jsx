import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import TaskForm from '../components/TaskForm';
import TaskTable from '../components/TaskTable';
import MonthSelector from '../components/MonthSelector';

export default function Tasks({ onMenuToggle }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [categories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const fetchTasks = async () => {
    setLoading(true);
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('date_received', startDate)
      .lte('date_received', endDate)
      .order('date_received', { ascending: false });

    if (error) {
      console.error('Tasks error:', error);
      setTasks([]);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [selectedMonth, selectedYear]);

  const createIncomeForTask = async (taskRows) => {
    const incomePayload = {
      amount: Number(taskRows.amount) || 0,
      source: `Payment for task: ${taskRows.title}`,
      description: taskRows.description || `Payment to ${taskRows.client_name || 'client'}`,
      date: new Date().toISOString().split('T')[0],
      payment_method: taskRows.payment_method || 'cash',
      user_id: user.id,
    };

    const { data: incomeData, error: insertErr } = await supabase.from('incomes').insert(incomePayload).select('id').single();
    if (insertErr) throw insertErr;
    return incomeData.id;
  };

  const handleAddTask = async (formData) => {
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        client_name: formData.client_name || null,
        amount: formData.amount || 0,
        status: formData.status,
        payment_method: formData.payment_method,
        date_received: formData.date_received,
        due_date: formData.due_date || null,
        user_id: user.id,
      };

      const { data: insertedData, error: insertError } = await supabase.from('tasks').insert(payload).select('*').single();
      if (insertError) throw insertError;

      if (formData.status === 'paid' && insertedData) {
        const incomeId = await createIncomeForTask(insertedData);
        const { error: attachErr } = await supabase.from('tasks').update({ income_id: incomeId }).eq('id', insertedData.id);
        if (attachErr) throw attachErr;
      }

      await fetchTasks();
    } catch (err) {
      alert('Error adding task: ' + err.message);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    try {
      const { data: taskRows, error: fetchErr } = await supabase.from('tasks').select('income_id').eq('id', id).single();
      if (fetchErr) throw fetchErr;

      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;

      // Task deleted; its associated income record should remain intact.
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      alert('Error deleting task: ' + err.message);
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      // fetch the full task row
      const { data: taskRows, error: fetchErr } = await supabase.from('tasks').select('*').eq('id', id).limit(1).single();
      if (fetchErr) throw fetchErr;

      let updatePayload = { status };
      if (status === 'paid' && !taskRows.income_id) {
        const incomeId = await createIncomeForTask(taskRows);
        updatePayload.income_id = incomeId;
      }

      const { error } = await supabase.from('tasks').update(updatePayload).eq('id', id);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const totalTasks = tasks.length;

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header title="Task Management" subtitle={`Client tasks — ${MONTHS[selectedMonth]} ${selectedYear}`} onMenuToggle={onMenuToggle} />

      <MonthSelector selectedMonth={selectedMonth} selectedYear={selectedYear} onChange={(m,y) => { setSelectedMonth(m); setSelectedYear(y); }} />

      <div className="page-summary">
        <div className="summary-card summary-card--expense">
          <span className="summary-label">Total Tasks</span>
          <span className="summary-value">{totalTasks}</span>
          <span className="summary-count">{tasks.length} entries</span>
        </div>
      </div>

      <TaskForm onSubmit={handleAddTask} loading={submitting} />

      {loading ? (<div className="loading-container"><div className="loading-spinner"></div></div>) : (
        <TaskTable data={tasks} onDelete={handleDelete} onUpdateStatus={handleUpdateStatus} />
      )}
    </div>
  );
}
