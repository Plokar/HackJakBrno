import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';

const BASE_ROLES = [
  { key: 'anesthesiologist', label: 'Anesteziolog', chipColor: 'secondary' },
  { key: 'primary', label: 'Primární lékař', chipColor: 'primary', showCostAlert: true },
  { key: 'secondary', label: 'Sekundární lékař', chipColor: 'default' }
];

const ANESTHESIA_BUFFER_MINUTES = 15;

const getAnesthesiaTimes = (scheduledStart, scheduledEnd) => {
  if (!scheduledStart || !scheduledEnd) {
    return { expectedStart: null, expectedEnd: null };
  }

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);
  const bufferMs = ANESTHESIA_BUFFER_MINUTES * 60 * 1000;

  return {
    expectedStart: new Date(start.getTime() - bufferMs),
    expectedEnd: new Date(end.getTime() + bufferMs)
  };
};

const buildInitialRoleAssignments = () =>
  BASE_ROLES.reduce((acc, role) => {
    acc[role.key] = null;
    return acc;
  }, {});

export default function PersonnelTab({ operation, onUpdate, loading, costSummary }) {
  const [doctors, setDoctors] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState(buildInitialRoleAssignments);
  const [customRoles, setCustomRoles] = useState([]);
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!operation) {
      setRoleAssignments(buildInitialRoleAssignments());
      setCustomRoles([]);
      return;
    }

    const baseAssignments = buildInitialRoleAssignments();
    if (operation.primary_doctor) {
      baseAssignments.primary = operation.primary_doctor;
    }

    let availableAssistants = Array.isArray(operation.assisting_doctors)
      ? operation.assisting_doctors.filter(
          (doctor) => doctor && doctor.id !== operation.primary_doctor?.id
        )
      : [];

    const anesthesiologistIndex = availableAssistants.findIndex((doctor) => {
      const specialization = doctor?.specialization?.toLowerCase() || '';
      return specialization.includes('anest');
    });

    if (anesthesiologistIndex >= 0) {
      baseAssignments.anesthesiologist = availableAssistants[anesthesiologistIndex];
      availableAssistants.splice(anesthesiologistIndex, 1);
    }

    if (availableAssistants.length > 0) {
      baseAssignments.secondary = availableAssistants[0];
      availableAssistants = availableAssistants.slice(1);
    }

    const importedRoles = availableAssistants.map((doctor, index) => ({
      key: `imported-${doctor.id}-${index}`,
      label: `Další personál ${index + 1}`
    }));

    const importedAssignments = importedRoles.reduce((acc, role, idx) => {
      acc[role.key] = availableAssistants[idx];
      return acc;
    }, {});

    setCustomRoles(importedRoles);
    setRoleAssignments({ ...baseAssignments, ...importedAssignments });
  }, [operation]);

  const loadDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const response = await fetch('/api/proxy/medic/doctors');
      if (response.ok) {
        const data = await response.json();
        setDoctors(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Chyba pri nacitani doktoru:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleRoleChange = (roleKey, doctor) => {
    setRoleAssignments((prev) => {
      const updated = { ...prev };

      if (doctor) {
        Object.keys(updated).forEach((key) => {
          if (key !== roleKey && updated[key]?.id === doctor.id) {
            updated[key] = null;
          }
        });
      }

      updated[roleKey] = doctor || null;
      return updated;
    });
  };

  const handleAddCustomRole = () => {
    const trimmed = newRoleLabel.trim();
    if (!trimmed) return;

    const key = `custom-${Date.now()}`;
    const newRole = { key, label: trimmed };

    setCustomRoles((prev) => [...prev, newRole]);
    setRoleAssignments((prev) => ({ ...prev, [key]: null }));
    setNewRoleLabel('');
  };

  const handleRemoveCustomRole = (roleKey) => {
    setCustomRoles((prev) => prev.filter((role) => role.key !== roleKey));
    setRoleAssignments((prev) => {
      const updated = { ...prev };
      delete updated[roleKey];
      return updated;
    });
  };

  const handleSave = () => {
    const primaryDoctor = roleAssignments.primary;
    const assistingDoctorIds = Object.entries(roleAssignments)
      .filter(([roleKey, doctor]) => roleKey !== 'primary' && doctor?.id)
      .map(([, doctor]) => doctor.id);

    const uniqueAssistingIds = Array.from(new Set(assistingDoctorIds));

    const personnelData = {
      primary_doctor_id: primaryDoctor?.id || null,
      assisting_doctor_ids: uniqueAssistingIds
    };

    onUpdate(personnelData);
  };

  const anesthesiaTimes = getAnesthesiaTimes(operation?.scheduled_start, operation?.scheduled_end);

  const formatTime = (date) =>
    date ? date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' }) : 'N/A';

  const calculatePersonnelCost = (doctor) => {
    if (!doctor || !operation?.scheduled_start || !operation?.scheduled_end) return 0;

    const start = new Date(operation.scheduled_start);
    const end = new Date(operation.scheduled_end);
    const hours = (end - start) / (1000 * 60 * 60);

    return Number(doctor.hourly_rate || 0) * hours;
  };

  const getUniqueAssignedDoctors = () => {
    const seen = new Set();
    const unique = [];

    Object.values(roleAssignments).forEach((doctor) => {
      if (doctor?.id && !seen.has(doctor.id)) {
        seen.add(doctor.id);
        unique.push(doctor);
      }
    });

    return unique;
  };

  const getTotalPersonnelCost = () =>
    getUniqueAssignedDoctors().reduce((total, doctor) => total + calculatePersonnelCost(doctor), 0);

  const getOperationDuration = () => {
    if (!operation?.scheduled_start || !operation?.scheduled_end) return 0;
    const start = new Date(operation.scheduled_start);
    const end = new Date(operation.scheduled_end);
    return (end - start) / (1000 * 60 * 60);
  };

  const doctorOptionLabel = (option) => {
    if (!option) return '';
    const specialization = option.specialization || 'Bez specializace';
    const hourlyRate = option.hourly_rate ?? 0;
    return `Dr. ${option.first_name} ${option.last_name} - ${specialization} (${hourlyRate} Kč/hod)`;
  };

  const renderRoleField = (role, { removable = false } = {}) => (
    <Box key={role.key} sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1">{role.label}</Typography>
        {removable && (
          <Tooltip title="Odebrat roli" arrow>
            <IconButton
              size="small"
              aria-label={`Odebrat roli ${role.label}`}
              onClick={() => handleRemoveCustomRole(role.key)}
            >
              ×
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <Autocomplete
        options={doctors}
        getOptionLabel={doctorOptionLabel}
        isOptionEqualToValue={(option, value) => option.id === value?.id}
        value={roleAssignments[role.key] || null}
        onChange={(event, newValue) => handleRoleChange(role.key, newValue)}
        loading={loadingDoctors}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`Vyberte ${role.label.toLowerCase()}`}
            variant="outlined"
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingDoctors ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              )
            }}
          />
        )}
      />
      {role.showCostAlert &&
        roleAssignments[role.key] &&
        operation?.scheduled_start &&
        operation?.scheduled_end && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Odhadované náklady:{' '}
            {calculatePersonnelCost(roleAssignments[role.key]).toLocaleString('cs-CZ')} Kč
            <br />
            <Typography variant="caption">
              (Délka operace: {getOperationDuration().toFixed(2)} hod ×{' '}
              {roleAssignments[role.key].hourly_rate} Kč/hod)
            </Typography>
          </Alert>
        )}
    </Box>
  );

  const assignedDoctorEntries = Object.entries(roleAssignments)
    .map(([roleKey, doctor]) => {
      if (!doctor) return null;
      const baseRole = BASE_ROLES.find((role) => role.key === roleKey);
      const customRole = customRoles.find((role) => role.key === roleKey);
      return {
        roleKey,
        roleLabel: baseRole?.label || customRole?.label || roleKey,
        chipColor: baseRole?.chipColor || 'default',
        doctor
      };
    })
    .filter(Boolean);

  const hasAssignedPersonnel = assignedDoctorEntries.length > 0;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Správa personálu operace
      </Typography>

      {operation?.scheduled_start && operation?.scheduled_end && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Harmonogram anestezie
          </Typography>
          <Typography variant="body2">
            Očekávaný začátek anestezie:{' '}
            <strong>{formatTime(anesthesiaTimes.expectedStart)}</strong>
          </Typography>
          <Typography variant="body2">
            Očekávaný konec anestezie:{' '}
            <strong>{formatTime(anesthesiaTimes.expectedEnd)}</strong>
          </Typography>
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Základní role
        </Typography>
        {BASE_ROLES.map((role) => renderRoleField(role))}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Další role
        </Typography>
        {customRoles.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Přidejte vlastní role podle potřeby operace.
          </Typography>
        )}
        {customRoles.map((role) => renderRoleField(role, { removable: true }))}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
          <TextField
            label="Název nové role"
            value={newRoleLabel}
            onChange={(event) => setNewRoleLabel(event.target.value)}
            size="small"
            sx={{ minWidth: 240 }}
          />
          <Button variant="outlined" onClick={handleAddCustomRole} disabled={!newRoleLabel.trim()}>
            Přidat roli
          </Button>
        </Box>
      </Box>

      {hasAssignedPersonnel && operation?.scheduled_start && operation?.scheduled_end && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Přehled personálu a nákladů
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Jméno</TableCell>
                  <TableCell>Specializace</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">Hodinová sazba</TableCell>
                  <TableCell align="right">Odhadované náklady</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assignedDoctorEntries.map(({ roleKey, roleLabel, chipColor, doctor }) => (
                  <TableRow key={`${roleKey}-${doctor.id}`}>
                    <TableCell>Dr. {doctor.first_name} {doctor.last_name}</TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>
                      <Chip label={roleLabel} color={chipColor} size="small" />
                    </TableCell>
                    <TableCell align="right">
                      {Number(doctor.hourly_rate || 0).toLocaleString('cs-CZ')} Kč
                    </TableCell>
                    <TableCell align="right">
                      <strong>{calculatePersonnelCost(doctor).toLocaleString('cs-CZ')} Kč</strong>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <strong>Celkem personál:</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong style={{ color: '#1976d2', fontSize: '1.1em' }}>
                      {getTotalPersonnelCost().toLocaleString('cs-CZ')} Kč
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Alert severity="info" sx={{ mt: 2 }}>
            Délka operace: {getOperationDuration().toFixed(2)} hodin
          </Alert>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
          {loading ? 'Ukládám...' : 'Uložit personál'}
        </Button>
      </Box>
    </Box>
  );
}
