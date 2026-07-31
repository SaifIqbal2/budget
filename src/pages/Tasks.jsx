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
      let advanceIncomeId = null;
      let incomeId = null;

      if (status === 'paid' && !taskRows.income_id) {
        const advanceAmount = Number(taskRows.advance_amount) || 0;
        const incomeAmount = Math.max((Number(taskRows.amount) || 0) - advanceAmount, 0);
        incomeId = await createIncomeForTask(taskRows, incomeAmount, advanceAmount > 0 ? ' (remaining)' : '');
        if (incomeId) updatePayload.income_id = incomeId;
      }

      if (status === 'paid' && !taskRows.advance_income_id && Number(taskRows.advance_amount) > 0) {
        advanceIncomeId = await createIncomeForTask(taskRows, Number(taskRows.advance_amount), ' (advance)');
        if (advanceIncomeId) updatePayload.advance_income_id = advanceIncomeId;
      }

      const { error } = await supabase.from('tasks').update(updatePayload).eq('id', id);
      if (error) throw error;

      const updatedTask = { ...taskRows, status };
      if (advanceIncomeId) {
        updatedTask.advance_income_id = advanceIncomeId;
      }
      if (incomeId) {
        updatedTask.income_id = incomeId;
      }

      if (status === 'paid') {
        setPrintTask(updatedTask);
        setPrintTitle('NEXUSGRADES Invoice');
        setPrintMode('invoice');
      }

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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatInvoiceNumber = (task) => {
    if (!task) return 'NG-2026-0000';
    
    // Year
    const year = 2026;
    
    // Create sequence number from task ID
    const idStr = task.id || '0000';
    const sequenceNum = parseInt(idStr.slice(0, 8).replace(/[^0-9]/g, '') || '0', 10) % 10000;
    const sequence = String(sequenceNum).padStart(4, '0');
    
    return `NG-${year}-${sequence}`;
  };

  const invoiceNumber = printTask ? formatInvoiceNumber(printTask) : 'NG-0000-0000';
  const invoiceDate = printTask?.date_received ? formatDate(printTask.date_received) : '—';
  const paymentDate = printTask?.date_received ? formatDate(printTask.date_received) : '—';
  const invoiceDueDate = printTask?.due_date ? formatDate(printTask.due_date) : '—';
  const invoiceAmount = Number(printTask?.amount) || 0;
  const invoiceAdvance = Number(printTask?.advance_amount) || 0;
  const invoiceDiscount = 0;
  const invoiceTax = 0;
  const invoiceSubtotal = invoiceAmount;
  const invoiceTotalAmount = invoiceSubtotal;
  const invoicePaidAmount = invoiceSubtotal;
  const invoiceItems = [
    {
      title: printTask?.title || printTask?.description || 'Task work and delivery',
      quantity: 1,
      unitPrice: invoiceSubtotal,
      amount: invoiceSubtotal,
    },
  ];
  const paymentMethod = printTask?.payment_method ? printTask.payment_method.charAt(0).toUpperCase() + printTask.payment_method.slice(1) : 'Bank Transfer';
  const transactionId = printTask?.income_id || printTask?.advance_income_id || printTask?.task_number || printTask?.id || 'N/A';

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
            <header className="invoice-header invoice-header--alt">
              <div className="invoice-brand-block">
                <div className="invoice-logo">
                  <img src="/assets/logo.png" alt="Nexus Grades logo" />
                </div>
                <div className="invoice-company-block">
                  <p className="invoice-company">NEXUS GRADES</p>
                  <p className="invoice-subtitle">REMOTE FREELANCE COMPANY</p>
                  <p className="invoice-contact">nexusgrades@gmail.com | +92 339 3301238 | www.nexusgrades.com</p>
                </div>
              </div>
              <div className="invoice-meta-block">
                <div>
                  <p className="invoice-meta-label">Invoice No</p>
                  <p className="invoice-meta-value">{invoiceNumber}</p>
                </div>
                <div>
                  <p className="invoice-meta-label">Invoice Date</p>
                  <p className="invoice-meta-value">{invoiceDate}</p>
                </div>
                <div>
                  <p className="invoice-meta-label">Payment Date</p>
                  <p className="invoice-meta-value">{paymentDate}</p>
                </div>
                <div>
                  <p className="invoice-meta-label">Currency</p>
                  <p className="invoice-meta-value">PKR</p>
                </div>
              </div>
            </header>

            <div className="invoice-rule invoice-rule--primary" />
            <div className="invoice-rule invoice-rule--secondary" />

            <section className="invoice-title-row">
              <div>
                <h1 className="invoice-title">INVOICE</h1>
                <span className="invoice-status">PAID</span>
              </div>
            </section>

            <section className="invoice-parties">
              <div className="invoice-party-card">
                <p className="invoice-party-heading">BILLED BY</p>
                <p className="invoice-party-name">Nexus Grades</p>
                <p className="invoice-party-address">Remote Freelance Company</p>
                <p className="invoice-party-address">nexusgrades@gmail.com</p>
                <p className="invoice-party-address">+92 339 3301238</p>
              </div>
              <div className="invoice-party-card">
                <p className="invoice-party-heading">BILLED TO</p>
                <p className="invoice-party-name">{printTask.client_name || 'Client Name'}</p>
                <p className="invoice-party-address">{printTask.client_address || 'Client address not provided'}</p>
              </div>
            </section>

            <table className="invoice-table">
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>QTY</th>
                  <th>UNIT PRICE</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {invoiceItems.map((item, index) => (
                  <tr key={`${item.title}-${index}`}>
                    <td>{item.title}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.unitPrice)}</td>
                    <td>{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="invoice-summary-block">
              <div className="invoice-summary-row"><span>Subtotal</span><strong>{formatCurrency(invoiceSubtotal)}</strong></div>
              <div className="invoice-summary-row"><span>Discount</span><strong>{formatCurrency(invoiceDiscount)}</strong></div>
              <div className="invoice-summary-row"><span>Tax</span><strong>{formatCurrency(invoiceTax)}</strong></div>
              <div className="invoice-summary-row invoice-summary-row--paid"><span>AMOUNT PAID</span><strong>{formatCurrency(invoicePaidAmount)}</strong></div>
            </div>

            <div className="invoice-payment-note-grid">
              <div className="invoice-payment-card">
                <p className="invoice-section-label">PAYMENT RECEIVED</p>
                <p><strong>Method:</strong> {paymentMethod}</p>
                <p><strong>Transaction ID:</strong> {transactionId}</p>
                <p><strong>Paid On:</strong> {paymentDate}</p>
              </div>
              <div className="invoice-payment-card">
                <p className="invoice-section-label">NOTE</p>
                <p>Payment is confirmed and fully received. Thank you for your business.</p>
              </div>
            </div>

            <section className="invoice-terms">
              <h2>Terms & Conditions</h2>
              <div className="invoice-terms-grid">
                <ol className="terms-list">
                  <li>Ownership — IP/deliverables transfer to Client only upon full payment (already received).</li>
                  <li>Confidentiality — both parties keep project details/data confidential.</li>
                  <li>Refund Policy — non-refundable once services are delivered, unless agreed otherwise in writing.</li>
                  <li>Currency & Charges — amounts in stated currency; bank/gateway charges borne by payer.</li>
                  <li>Warranty — services provided "as-is"; extra revisions need a separate agreement.</li>
                  <li>Governing Law — governed by the laws of Pakistan unless otherwise agreed.</li>
                  <li>Dispute Resolution — resolved first through good-faith negotiation.</li>
                  <li>Records — invoice serves as an official payment record for accounting/tax purposes.</li>
                </ol>
              </div>
            </section>

            <p className="invoice-footer-note">This is a computer-generated invoice confirming payment received and does not require a signature.</p>
            <div className="invoice-footer-rule" />
            <p className="invoice-footer-text">Remote Freelance Company | www.nexusgrades.com | +92 339 3301238</p>
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

            <section className="client-info statement-info">
              <div>
                <p><strong>Statement For:</strong> {MONTHS[selectedMonth]} {selectedYear}</p>
                <p><strong>Prepared By:</strong> {user.email}</p>
              </div>
              <div>
                <p><strong>Total Tasks:</strong> {tasks.length}</p>
                <p><strong>Period:</strong> {MONTHS[selectedMonth]} {selectedYear}</p>
              </div>
            </section>

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
                    <td colSpan="7">No tasks available for statement printing.</td>
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
