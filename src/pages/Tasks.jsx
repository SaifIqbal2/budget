import { useState, useEffect, useRef } from 'react';
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
  const [editingTask, setEditingTask] = useState(null);
  const [printMode, setPrintMode] = useState(null);
  const [printTask, setPrintTask] = useState(null);
  const [printTitle, setPrintTitle] = useState(null);
  const printedRef = useRef(false);
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

  const createIncomeForTask = async (taskRows, incomeAmount, suffix = '') => {
    if (incomeAmount <= 0) return null;
    const incomePayload = {
      amount: Number(incomeAmount) || 0,
      source: `Payment for task: ${taskRows.title}${suffix}`,
      description: taskRows.description || `Payment to ${taskRows.client_name || 'client'}`,
      date: new Date().toISOString().split('T')[0],
      payment_method: taskRows.payment_method || 'cash',
      user_id: user.id,
    };

    const { data: incomeData, error: insertErr } = await supabase.from('incomes').insert(incomePayload).select('id').single();
    if (insertErr) throw insertErr;
    return incomeData.id;
  };

  const handleSaveTask = async (formData) => {
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        client_name: formData.client_name || null,
        amount: Number(formData.amount) || 0,
        advance_amount: Number(formData.advance_amount) || 0,
        status: formData.status,
        payment_method: formData.payment_method,
        date_received: formData.date_received,
        due_date: formData.due_date || null,
        user_id: user.id,
      };

      if (!editingTask) {
        const { data: insertedData, error: insertError } = await supabase.from('tasks').insert(payload).select('*').single();
        if (insertError) throw insertError;

        if (payload.advance_amount > 0) {
          const advanceIncomeId = await createIncomeForTask(insertedData, payload.advance_amount, ' (advance)');
          const { error: attachAdvErr } = await supabase.from('tasks').update({ advance_income_id: advanceIncomeId }).eq('id', insertedData.id);
          if (attachAdvErr) throw attachAdvErr;
        }

        if (payload.status === 'paid') {
          const remaining = payload.amount - payload.advance_amount;
          if (remaining > 0) {
            const finalIncomeId = await createIncomeForTask(insertedData, remaining, payload.advance_amount > 0 ? ' (remaining)' : '');
            if (finalIncomeId) {
              const { error: attachFinalErr } = await supabase.from('tasks').update({ income_id: finalIncomeId }).eq('id', insertedData.id);
              if (attachFinalErr) throw attachFinalErr;
            }
          }
        }
      } else {
        const taskId = editingTask.id;
        const { data: currentTask, error: taskFetchErr } = await supabase.from('tasks').select('*').eq('id', taskId).single();
        if (taskFetchErr) throw taskFetchErr;

        const updatePayload = { ...payload };

        if (payload.advance_amount > 0 && !currentTask.advance_income_id) {
          const advanceIncomeId = await createIncomeForTask(currentTask, payload.advance_amount, ' (advance)');
          updatePayload.advance_income_id = advanceIncomeId;
        }

        if (payload.status === 'paid' && !currentTask.income_id) {
          const remaining = payload.amount - (payload.advance_amount || 0);
          if (remaining > 0) {
            const finalIncomeId = await createIncomeForTask(currentTask, remaining, payload.advance_amount > 0 ? ' (remaining)' : '');
            updatePayload.income_id = finalIncomeId;
          }
        }

        const { error: updateErr } = await supabase.from('tasks').update(updatePayload).eq('id', taskId);
        if (updateErr) throw updateErr;
      }

      setEditingTask(null);
      await fetchTasks();
    } catch (err) {
      alert('Error saving task: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      alert('Error deleting task: ' + err.message);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      // fetch the full task row
      const { data: taskRows, error: fetchErr } = await supabase.from('tasks').select('*').eq('id', id).limit(1).single();
      if (fetchErr) throw fetchErr;

      let updatePayload = { status };
      if (status === 'paid' && !taskRows.income_id) {
        const advanceAmount = Number(taskRows.advance_amount) || 0;
        const incomeAmount = Math.max((Number(taskRows.amount) || 0) - advanceAmount, 0);
        const incomeId = await createIncomeForTask(taskRows, incomeAmount, advanceAmount > 0 ? ' (remaining)' : '');
        if (incomeId) updatePayload.income_id = incomeId;
      }

      const { error } = await supabase.from('tasks').update(updatePayload).eq('id', id);
      if (error) throw error;
      await fetchTasks();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handlePrintTaskInvoice = (task) => {
    printedRef.current = false;
    setPrintTask(task);
    setPrintTitle('NEXUSGRADES Invoice');
    setPrintMode('invoice');
  };

  const handlePrintStatement = () => {
    printedRef.current = false;
    setPrintTitle('NEXUSGRADES Statement');
    setPrintMode('statement');
  };

  useEffect(() => {
    if (!printMode || printedRef.current) return;
    printedRef.current = true;

    const previousTitle = document.title;
    if (printTitle) document.title = printTitle;

    const clearPrintState = () => {
      printedRef.current = false;
      setPrintMode(null);
      setPrintTask(null);
      setPrintTitle(null);
      document.title = previousTitle;
    };

    window.addEventListener('afterprint', clearPrintState);
    const printTimeout = setTimeout(() => window.print(), 100);
    return () => {
      clearTimeout(printTimeout);
      window.removeEventListener('afterprint', clearPrintState);
      document.title = previousTitle;
    };
  }, [printMode, printTitle]);

  const totalTasks = tasks.length;

  const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="page">
      <Header title="Task Management" subtitle={`Client tasks — ${MONTHS[selectedMonth]} ${selectedYear}`} onMenuToggle={onMenuToggle} />

      <MonthSelector selectedMonth={selectedMonth} selectedYear={selectedYear} onChange={(m,y) => { setSelectedMonth(m); setSelectedYear(y); }} />

      <div className="task-actions">
        <button className="btn btn-primary" type="button" onClick={handlePrintStatement}>🖨️ Print Statement</button>
      </div>

      <div className="page-summary">
        <div className="summary-card summary-card--expense">
          <span className="summary-label">Total Tasks</span>
          <span className="summary-value">{totalTasks}</span>
          <span className="summary-count">{tasks.length} entries</span>
        </div>
      </div>

      <TaskForm
        onSubmit={handleSaveTask}
        loading={submitting}
        defaults={editingTask || {}}
        onCancel={editingTask ? handleCancelEdit : undefined}
      />

      {loading ? (<div className="loading-container"><div className="loading-spinner"></div></div>) : (
        <TaskTable
          data={tasks}
          onDelete={handleDelete}
          onEdit={handleEditTask}
          onUpdateStatus={handleUpdateStatus}
          onPrintInvoice={handlePrintTaskInvoice}
        />
      )}

      <div className={`print-wrapper ${printMode ? 'print-active' : ''}`}>
        {printMode === 'invoice' && printTask && (
          <article className="invoice-page">
            <header className="invoice-header">
              <div className="invoice-brand">
                <div className="invoice-logo">
                  <img src="/assets/logo.png" alt="NEXUSGRADES logo" />
                </div>
                <div>
                  <p className="invoice-company">NEXUSGRADES</p>
                  <p className="invoice-subtitle">Remote Freelance Company</p>
                </div>
              </div>
              <div className="invoice-meta">
                <p><strong>Email:</strong> nexusgrades@gmail.com</p>
                <p><strong>Phone:</strong> +923393301238</p>
                <p><strong>Address:</strong> Remote, Freelance Company</p>
              </div>
            </header>

            <section className="invoice-intro">
              <h1>Invoice</h1>
              <p>Invoice for task work and payment details.</p>
            </section>

            <section className="invoice-details">
              <div>
                <p className="invoice-label">Task #</p>
                <p>{printTask.task_number || printTask.id || 'N/A'}</p>
              </div>
              <div>
                <p className="invoice-label">Title</p>
                <p>{printTask.title}</p>
              </div>
              <div>
                <p className="invoice-label">Client</p>
                <p>{printTask.client_name || 'Client not provided'}</p>
              </div>
              <div>
                <p className="invoice-label">Received</p>
                <p>{printTask.date_received ? new Date(printTask.date_received).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="invoice-label">Due Date</p>
                <p>{printTask.due_date ? new Date(printTask.due_date).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="invoice-label">Status</p>
                <p>{printTask.status || '—'}</p>
              </div>
            </section>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Advance Paid</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{printTask.description || 'Task work and delivery'}</td>
                  <td>Rs {Math.round(Number(printTask.advance_amount) || 0)}</td>
                  <td>Rs {Math.round(Number(printTask.amount) || 0)}</td>
                </tr>
              </tbody>
            </table>

            <div className="invoice-summary-block">
              <p><strong>Total Amount:</strong> Rs {Math.round(Number(printTask.amount) || 0)}</p>
              <p><strong>Advance Paid:</strong> Rs {Math.round(Number(printTask.advance_amount) || 0)}</p>
              <p><strong>Statement:</strong> This invoice reflects the paid advance and the final amount.
              </p>
            </div>

            <footer className="invoice-footer">
              <p>For support, email nexusgrades@gmail.com or call +923393301238.</p>
            </footer>
          </article>
        )}

        {printMode === 'statement' && (
          <article className="invoice-page">
            <header className="invoice-header">
              <div className="invoice-brand">
                <div className="invoice-logo">
                  <img src="/assets/logo.png" alt="NEXUSGRADES logo" />
                </div>
                <div>
                  <p className="invoice-company">NEXUSGRADES</p>
                  <p className="invoice-subtitle">Remote Freelance Company</p>
                </div>
              </div>
              <div className="invoice-meta">
                <p><strong>Email:</strong> nexusgrades@gmail.com</p>
                <p><strong>Phone:</strong> +923393301238</p>
                <p><strong>Address:</strong> Remote, Freelance Company</p>
              </div>
            </header>

            <section className="invoice-intro">
              <h1>Task Statement</h1>
              <p>This statement includes all tasks for the selected month.</p>
            </section>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Task #</th>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Description</th>
                  <th>Advance</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length > 0 ? tasks.map((task) => (
                  <tr key={task.id}>
                    <td>{task.date_received ? new Date(task.date_received).toLocaleDateString() : '—'}</td>
                    <td>{task.task_number || task.id || '—'}</td>
                    <td>{task.title}</td>
                    <td>{task.client_name || '—'}</td>
                    <td>{task.description || '—'}</td>
                    <td>Rs {Math.round(Number(task.advance_amount) || 0)}</td>
                    <td>Rs {Math.round(Number(task.amount) || 0)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8">No tasks available for statement printing.</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="invoice-summary-block">
              <p><strong>Total tasks:</strong> {tasks.length}</p>
              <p><strong>Total amount:</strong> Rs {tasks.reduce((sum, task) => sum + Math.round(Number(task.amount) || 0), 0)}</p>
            </div>

            <footer className="invoice-footer">
              <p>Remote Freelance Company — nexusgrades</p>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
