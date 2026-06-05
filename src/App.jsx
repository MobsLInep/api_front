import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function App() {
  // --- States ---
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form States
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formAlert, setFormAlert] = useState(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Scheduler Trigger State
  const [isCheckingReminders, setIsCheckingReminders] = useState(false);

  // --- Fetch Appointments ---
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/appointments`);
      if (!res.ok) {
        throw new Error(`Failed to load appointments: ${res.statusText}`);
      }
      const data = await res.json();
      setAppointments(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not connect to the backend API. Ensure the server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // --- Form Submission ---
  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim() || !appointmentTime) {
      setFormAlert({ type: 'error', message: 'Please fill in all fields' });
      return;
    }

    // Basic phone number format check (+ prefix or digits)
    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      setFormAlert({ type: 'error', message: 'Please enter a valid phone number (e.g. +919876543210)' });
      return;
    }

    // Check that appointment time is in the future
    const appointmentDate = new Date(appointmentTime);
    if (appointmentDate.getTime() <= Date.now()) {
      setFormAlert({ type: 'error', message: 'Appointment time must be in the future.' });
      return;
    }

    setIsSubmitting(true);
    setFormAlert(null);

    try {
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phoneNumber,
          appointmentTime
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Failed to create appointment');
      }

      setFormAlert({
        type: 'success',
        message: `Appointment created successfully! ${
          result.messaging.status === 'sent' 
            ? 'WhatsApp confirmation dispatched.' 
            : 'WhatsApp simulation logged to server console.'
        }`
      });

      // Clear form inputs
      setCustomerName('');
      setPhoneNumber('');
      setAppointmentTime('');

      // Refresh Dashboard List
      fetchAppointments();
    } catch (err) {
      console.error('Submit error:', err);
      setFormAlert({ type: 'error', message: err.message || 'An error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Manual Reminder Check ---
  const handleTriggerReminderCheck = async () => {
    setIsCheckingReminders(true);
    try {
      const res = await fetch(`${API_URL}/appointments/check-reminders`, {
        method: 'POST'
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to trigger reminder check');
      }
      
      alert(
        `Reminder check complete!\nProcessed: ${result.processedCount} upcoming appointment(s) starting in the next 60 minutes.`
      );

      // Refresh appointments to see updated badge states
      fetchAppointments();
    } catch (err) {
      console.error('Trigger reminder error:', err);
      alert('Error triggering reminder check: ' + err.message);
    } finally {
      setIsCheckingReminders(false);
    }
  };

  // --- Date Formatter Helper ---
  const formatDateTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return isoString;
    }
  };

  // --- Filtered Appointments ---
  const filteredAppointments = appointments.filter(appt => {
    const search = searchTerm.toLowerCase();
    return (
      appt.customerName.toLowerCase().includes(search) ||
      appt.phoneNumber.includes(search)
    );
  });

  // --- Stats Calculations ---
  const totalBooked = appointments.length;
  const remindersSent = appointments.filter(a => a.reminderSent).length;
  
  // Calculate upcoming appointments within next 60 mins that haven't sent reminder yet
  const upcomingRemindersCount = appointments.filter(a => {
    if (a.reminderSent) return false;
    const now = new Date();
    const apptTime = new Date(a.appointmentTime);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    return apptTime > now && apptTime <= oneHourFromNow;
  }).length;

  return (
    <div className="app-container">
      {/* Header */}
      <header>
        <div className="brand-section">
          <div className="logo-glow">⚡</div>
          <div>
            <h1>Scheduler Pro</h1>
            <p className="subtitle">Real-time Appointment & WhatsApp Reminder Panel</p>
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={handleTriggerReminderCheck}
            disabled={isCheckingReminders}
          >
            {isCheckingReminders ? (
              <>
                <span className="spinner"></span> Checking...
              </>
            ) : (
              '⏰ Run Reminder Check'
            )}
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left Side: Booking Form */}
        <section className="glass-panel">
          <h2 className="panel-title">
            <span>📅</span> New Appointment
          </h2>
          
          {formAlert && (
            <div className={`alert alert-${formAlert.type}`}>
              {formAlert.type === 'success' ? '✅' : '❌'} {formAlert.message}
            </div>
          )}

          <form onSubmit={handleCreateAppointment}>
            <div className="form-group">
              <label className="form-label" htmlFor="customer-name">Customer Name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  id="customer-name"
                  type="text"
                  className="form-input"
                  placeholder="John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="phone-number">Phone Number (with Country Code)</label>
              <div className="input-wrapper">
                <span className="input-icon">📞</span>
                <input
                  id="phone-number"
                  type="tel"
                  className="form-input"
                  placeholder="+919876543210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="appointment-time">Appointment Time</label>
              <div className="input-wrapper">
                <span className="input-icon">🕒</span>
                <input
                  id="appointment-time"
                  type="datetime-local"
                  className="form-input"
                  value={appointmentTime}
                  onChange={(e) => setAppointmentTime(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner"></span> Registering...
                </>
              ) : (
                'Create Appointment'
              )}
            </button>
          </form>
        </section>

        {/* Right Side: Dashboard & Statistics */}
        <section className="glass-panel">
          {/* Stats Bar */}
          <div className="stats-container">
            <div className="stat-card">
              <div className="stat-icon primary">📅</div>
              <div className="stat-info">
                <span className="stat-value">{totalBooked}</span>
                <span className="stat-label">Total Booked</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon success">💬</div>
              <div className="stat-info">
                <span className="stat-value">{remindersSent}</span>
                <span className="stat-label">Reminders Dispatched</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon warning">🔔</div>
              <div className="stat-info">
                <span className="stat-value">{upcomingRemindersCount}</span>
                <span className="stat-label">Pending Reminders (&lt;1h)</span>
              </div>
            </div>
          </div>

          <h2 className="panel-title">
            <span>📋</span> Appointment Dashboard
          </h2>

          {error && (
            <div className="alert alert-error">
              ⚠️ {error}
            </div>
          )}

          {/* Table Toolbar */}
          <div className="dashboard-actions">
            <div className="search-box">
              <div className="input-wrapper">
                <span className="input-icon">🔍</span>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Search by name or number..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>
            <button className="btn btn-secondary" onClick={fetchAppointments} disabled={loading}>
              🔄 Refresh List
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="empty-state">
              <span className="spinner"></span>
              <p>Fetching database records...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>No Appointments Found</h3>
              <p>{searchTerm ? 'Try adjusting your search criteria.' : 'Create your first appointment using the form.'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone Number</th>
                    <th>Appointment Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((appt) => {
                    const isUpcomingWithin1Hour = (() => {
                      if (appt.reminderSent) return false;
                      const now = new Date();
                      const apptTime = new Date(appt.appointmentTime);
                      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
                      return apptTime > now && apptTime <= oneHourFromNow;
                    })();

                    return (
                      <tr key={appt.id}>
                        <td className="customer-name-cell">{appt.customerName}</td>
                        <td className="phone-cell">{appt.phoneNumber}</td>
                        <td>{formatDateTime(appt.appointmentTime)}</td>
                        <td>
                          {appt.reminderSent ? (
                            <span className="badge badge-success">✓ Reminder Sent</span>
                          ) : isUpcomingWithin1Hour ? (
                            <span className="badge badge-warning">⚠️ Reminder Pending (&lt;1h)</span>
                          ) : (
                            <span className="badge badge-info">✓ Confirmed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;
