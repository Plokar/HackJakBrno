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
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';

export default function EquipmentTab({ operation, onAdd, onRefresh, loading, costSummary }) {
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [estimatedHours, setEstimatedHours] = useState(1);
  const [loadingEquipment, setLoadingEquipment] = useState(false);

  useEffect(() => {
    loadEquipment();
  }, []);

  const loadEquipment = async () => {
    setLoadingEquipment(true);
    try {
      const response = await fetch('/api/proxy/medic/equipment');
      if (response.ok) {
        const data = await response.json();
        const equipmentArray = Array.isArray(data) ? data : data.results || [];
        setEquipment(equipmentArray.filter(e => e.is_operational));
      }
    } catch (err) {
      console.error('Chyba pri nacitani pristroju:', err);
    } finally {
      setLoadingEquipment(false);
    }
  };

  const handleAdd = () => {
    if (!selectedEquipment) return;
    
    onAdd({
      equipment_id: selectedEquipment.id,
      estimated_hours: parseFloat(estimatedHours)
    });

    // Reset formuláře
    setSelectedEquipment(null);
    setEstimatedHours(1);
  };

  const getTotalEquipmentCost = () => {
    return costSummary?.equipment_cost || 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Správa přístrojů operace
      </Typography>

      {/* Formulář pro přidání přístroje */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Přidat přístroj
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={equipment}
            getOptionLabel={(option) => 
              `${option.name} - ${option.hourly_depreciation.toFixed(2)} Kč/hod`
            }
            value={selectedEquipment}
            onChange={(event, newValue) => setSelectedEquipment(newValue)}
            loading={loadingEquipment}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vyberte přístroj"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.category} • {option.equipment_code} • {option.hourly_depreciation.toFixed(2)} Kč/hod
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Zbývající životnost: {option.remaining_lifetime_percent.toFixed(1)}%
                  </Typography>
                </Box>
              </li>
            )}
          />

          <TextField
            type="number"
            label="Odhadované hodiny"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(parseFloat(e.target.value) || 1)}
            inputProps={{ min: 0.5, step: 0.5 }}
            sx={{ width: 180 }}
          />

          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!selectedEquipment || loading}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Přidat
          </Button>
        </Box>

        {selectedEquipment && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Náklady: {estimatedHours} hod × {selectedEquipment.hourly_depreciation.toFixed(2)} Kč/hod = {
              (estimatedHours * selectedEquipment.hourly_depreciation).toLocaleString('cs-CZ')
            } Kč
          </Alert>
        )}
      </Paper>

      {/* Seznam použitých přístrojů */}
      {costSummary && costSummary.equipment_details && costSummary.equipment_details.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Použité přístroje
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Název</TableCell>
                  <TableCell>Kód přístroje</TableCell>
                  <TableCell align="right">Hodinová sazba</TableCell>
                  <TableCell align="right">Využité hodiny</TableCell>
                  <TableCell align="right">Celkem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costSummary.equipment_details.map((equip) => (
                  <TableRow key={equip.id}>
                    <TableCell>{equip.equipment_name}</TableCell>
                    <TableCell>{equip.equipment_code}</TableCell>
                    <TableCell align="right">
                      {parseFloat(equip.hourly_depreciation).toLocaleString('cs-CZ')} Kč/hod
                    </TableCell>
                    <TableCell align="right">
                      {parseFloat(equip.hours_used)} hod
                    </TableCell>
                    <TableCell align="right">
                      <strong>{parseFloat(equip.cost).toLocaleString('cs-CZ')} Kč</strong>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <strong>Celkem přístroje:</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong style={{ color: '#1976d2', fontSize: '1.1em' }}>
                      {getTotalEquipmentCost().toLocaleString('cs-CZ')} Kč
                    </strong>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {(!costSummary || !costSummary.equipment_details || costSummary.equipment_details.length === 0) && (
        <Alert severity="info">
          Zatím nebyly přidány žádné přístroje.
        </Alert>
      )}
    </Box>
  );
}
