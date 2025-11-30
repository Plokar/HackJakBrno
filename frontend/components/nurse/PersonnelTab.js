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
  CircularProgress
} from '@mui/material';

export default function PersonnelTab({ operation, onUpdate, loading, costSummary }) {
  const [doctors, setDoctors] = useState([]);
  const [primaryDoctor, setPrimaryDoctor] = useState(null);
  const [assistingDoctors, setAssistingDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  useEffect(() => {
    loadDoctors();
    if (operation) {
      // Nastavit aktuální personál
      if (operation.primary_doctor) {
        setPrimaryDoctor(operation.primary_doctor);
      }
      if (operation.assisting_doctors) {
        setAssistingDoctors(operation.assisting_doctors);
      }
    }
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

  const handleSave = () => {
    const personnelData = {
      primary_doctor_id: primaryDoctor?.id || null,
      assisting_doctor_ids: assistingDoctors.map(d => d.id)
    };
    onUpdate(personnelData);
  };

  // Výpočet nákladů na personál přímo v komponentě
  const calculatePersonnelCost = (doctor, role) => {
    if (!operation.scheduled_start || !operation.scheduled_end) return 0;
    
    const start = new Date(operation.scheduled_start);
    const end = new Date(operation.scheduled_end);
    const hours = (end - start) / (1000 * 60 * 60); // Převod na hodiny
    
    return doctor.hourly_rate * hours;
  };

  const getTotalPersonnelCost = () => {
    let total = 0;
    
    if (primaryDoctor) {
      total += calculatePersonnelCost(primaryDoctor, 'primary');
    }
    
    assistingDoctors.forEach(doctor => {
      total += calculatePersonnelCost(doctor, 'assisting');
    });
    
    return total;
  };

  const getOperationDuration = () => {
    if (!operation.scheduled_start || !operation.scheduled_end) return 0;
    const start = new Date(operation.scheduled_start);
    const end = new Date(operation.scheduled_end);
    return (end - start) / (1000 * 60 * 60);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Správa personálu operace
      </Typography>

      {/* Primární lékař */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Primární lékař
        </Typography>
        <Autocomplete
          options={doctors}
          getOptionLabel={(option) => 
            `Dr. ${option.first_name} ${option.last_name} - ${option.specialization} (${option.hourly_rate} Kč/hod)`
          }
          value={primaryDoctor}
          onChange={(event, newValue) => setPrimaryDoctor(newValue)}
          loading={loadingDoctors}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vyberte primárního lékaře"
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingDoctors ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        {primaryDoctor && operation.scheduled_start && operation.scheduled_end && (
          <Alert severity="info" sx={{ mt: 1 }}>
            Odhadované náklady: {calculatePersonnelCost(primaryDoctor, 'primary').toLocaleString('cs-CZ')} Kč
            <br />
            <Typography variant="caption">
              (Délka operace: {getOperationDuration().toFixed(2)} hod × {primaryDoctor.hourly_rate} Kč/hod)
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Asistující lékaři */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Asistující lékaři
        </Typography>
        <Autocomplete
          multiple
          options={doctors}
          getOptionLabel={(option) => 
            `Dr. ${option.first_name} ${option.last_name} - ${option.specialization} (${option.hourly_rate} Kč/hod)`
          }
          value={assistingDoctors}
          onChange={(event, newValue) => setAssistingDoctors(newValue)}
          loading={loadingDoctors}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Vyberte asistující lékaře"
              variant="outlined"
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip
                label={`Dr. ${option.first_name} ${option.last_name}`}
                {...getTagProps({ index })}
                key={option.id}
              />
            ))
          }
        />
      </Box>

      {/* Přehled personálu */}
      {(primaryDoctor || assistingDoctors.length > 0) && operation.scheduled_start && operation.scheduled_end && (
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
                {primaryDoctor && (
                  <TableRow>
                    <TableCell>
                      Dr. {primaryDoctor.first_name} {primaryDoctor.last_name}
                    </TableCell>
                    <TableCell>{primaryDoctor.specialization}</TableCell>
                    <TableCell>
                      <Chip 
                        label="Primární"
                        color="primary"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(primaryDoctor.hourly_rate).toLocaleString('cs-CZ')} Kč
                    </TableCell>
                    <TableCell align="right">
                      <strong>{calculatePersonnelCost(primaryDoctor, 'primary').toLocaleString('cs-CZ')} Kč</strong>
                    </TableCell>
                  </TableRow>
                )}
                {assistingDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell>
                      Dr. {doctor.first_name} {doctor.last_name}
                    </TableCell>
                    <TableCell>{doctor.specialization}</TableCell>
                    <TableCell>
                      <Chip 
                        label="Asistent"
                        color="default"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(doctor.hourly_rate).toLocaleString('cs-CZ')} Kč
                    </TableCell>
                    <TableCell align="right">
                      <strong>{calculatePersonnelCost(doctor, 'assisting').toLocaleString('cs-CZ')} Kč</strong>
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
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading && <CircularProgress size={20} sx={{ mr: 1 }} />}
          {loading ? 'Ukládám...' : 'Uložit personál'}
        </Button>
      </Box>
    </Box>
  );
}
