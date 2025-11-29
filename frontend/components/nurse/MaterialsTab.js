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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';

export default function MaterialsTab({ operation, onAdd, onRefresh, loading, costSummary }) {
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const response = await fetch('/api/proxy/medic/materials');
      if (response.ok) {
        const data = await response.json();
        setMaterials(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Chyba pri nacitani materialu:', err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const handleAdd = () => {
    if (!selectedMaterial) return;
    
    if (selectedMaterial.stock_quantity < quantity) {
      alert(`Nedostatek materiálu na skladě. Dostupné: ${selectedMaterial.stock_quantity}`);
      return;
    }
    
    onAdd({
      material_id: selectedMaterial.id,
      quantity: quantity
    });

    // Reset formuláře
    setSelectedMaterial(null);
    setQuantity(1);
    
    // Reload materials to update stock
    setTimeout(() => loadMaterials(), 500);
  };

  const handleRemove = async (materialUsageId) => {
    try {
      const response = await fetch(
        `/api/proxy/medic/nurse/operations/${operation.id}/remove-material/${materialUsageId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        onRefresh();
        loadMaterials(); // Reload to update stock
      }
    } catch (err) {
      console.error('Chyba pri odebirani materialu:', err);
    }
  };

  const getTotalMaterialsCost = () => {
    return costSummary?.materials_cost || 0;
  };

  const isLowStock = (material) => {
    return material.stock_quantity <= material.minimum_stock;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Správa materiálů operace
      </Typography>

      {/* Formulář pro přidání materiálu */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Přidat materiál
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={materials}
            getOptionLabel={(option) => 
              `${option.name} - ${option.unit_price} Kč/${option.unit} (Sklad: ${option.stock_quantity})`
            }
            value={selectedMaterial}
            onChange={(event, newValue) => setSelectedMaterial(newValue)}
            loading={loadingMaterials}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vyberte materiál"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body1">{option.name}</Typography>
                    {isLowStock(option) && (
                      <Chip 
                        label="Nízký stav" 
                        size="small" 
                        color="warning"
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {option.category} • EAN: {option.ean_code} • {option.unit_price} Kč/{option.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Sklad: {option.stock_quantity} {option.unit}
                  </Typography>
                </Box>
              </li>
            )}
          />

          <TextField
            type="number"
            label="Množství"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            inputProps={{ 
              min: 1,
              max: selectedMaterial?.stock_quantity || 999
            }}
            sx={{ width: 120 }}
            error={selectedMaterial && quantity > selectedMaterial.stock_quantity}
            helperText={
              selectedMaterial && quantity > selectedMaterial.stock_quantity 
                ? `Max: ${selectedMaterial.stock_quantity}`
                : ''
            }
          />

          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={
              !selectedMaterial || 
              loading || 
              (selectedMaterial && quantity > selectedMaterial.stock_quantity)
            }
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Přidat
          </Button>
        </Box>

        {selectedMaterial && (
          <Alert 
            severity={quantity > selectedMaterial.stock_quantity ? "error" : "info"} 
            sx={{ mt: 2 }}
          >
            {quantity > selectedMaterial.stock_quantity ? (
              `Nedostatek materiálu! Dostupné: ${selectedMaterial.stock_quantity} ${selectedMaterial.unit}`
            ) : (
              <>
                Náklady: {quantity} × {selectedMaterial.unit_price} Kč = {
                  (quantity * selectedMaterial.unit_price).toLocaleString('cs-CZ')
                } Kč
                <br />
                Po použití zůstane: {selectedMaterial.stock_quantity - quantity} {selectedMaterial.unit}
              </>
            )}
          </Alert>
        )}
      </Paper>

      {/* Seznam použitých materiálů */}
      {costSummary && costSummary.materials_details && costSummary.materials_details.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Použité materiály
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Název</TableCell>
                  <TableCell>EAN kód</TableCell>
                  <TableCell align="right">Jednotková cena</TableCell>
                  <TableCell align="right">Množství</TableCell>
                  <TableCell align="right">Celkem</TableCell>
                  <TableCell>Naskenováno</TableCell>
                  <TableCell align="center">Akce</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costSummary.materials_details.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell>{material.material_name}</TableCell>
                    <TableCell>{material.material_ean}</TableCell>
                    <TableCell align="right">
                      {parseFloat(material.unit_price).toLocaleString('cs-CZ')} Kč/{material.unit}
                    </TableCell>
                    <TableCell align="right">
                      {material.quantity_used} {material.unit}
                    </TableCell>
                    <TableCell align="right">
                      <strong>{parseFloat(material.cost).toLocaleString('cs-CZ')} Kč</strong>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={new Date(material.scanned_at).toLocaleTimeString('cs-CZ')}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => handleRemove(material.id)}
                      >
                        Odebrat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={4} align="right">
                    <strong>Celkem materiály:</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong style={{ color: '#1976d2', fontSize: '1.1em' }}>
                      {getTotalMaterialsCost().toLocaleString('cs-CZ')} Kč
                    </strong>
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {(!costSummary || !costSummary.materials_details || costSummary.materials_details.length === 0) && (
        <Alert severity="info">
          Zatím nebyly přidány žádné materiály.
        </Alert>
      )}
    </Box>
  );
}
