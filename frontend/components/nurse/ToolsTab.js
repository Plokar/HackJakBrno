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

export default function ToolsTab({ operation, onAdd, onRefresh, loading, costSummary }) {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loadingTools, setLoadingTools] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    setLoadingTools(true);
    try {
      const response = await fetch('/api/proxy/medic/tools');
      if (response.ok) {
        const data = await response.json();
        setTools(Array.isArray(data) ? data : data.results || []);
      }
    } catch (err) {
      console.error('Chyba pri nacitani nastroju:', err);
    } finally {
      setLoadingTools(false);
    }
  };

  const handleAdd = () => {
    if (!selectedTool) return;
    
    onAdd({
      tool_id: selectedTool.id,
      quantity: quantity
    });

    // Reset formuláře
    setSelectedTool(null);
    setQuantity(1);
  };

  const handleRemove = async (toolUsageId) => {
    try {
      const response = await fetch(
        `/api/proxy/medic/nurse/operations/${operation.id}/remove-tool/${toolUsageId}`,
        { method: 'DELETE' }
      );
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Chyba pri odebirani nastroje:', err);
    }
  };

  const getTotalToolsCost = () => {
    return costSummary?.tools_cost || 0;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Správa nástrojů operace
      </Typography>

      {/* Formulář pro přidání nástroje */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Přidat nástroj
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Autocomplete
            sx={{ flex: 1 }}
            options={tools}
            getOptionLabel={(option) => 
              `${option.name} - ${option.category} (${option.sterilization_cost || 0} Kč/použití)`
            }
            value={selectedTool}
            onChange={(event, newValue) => setSelectedTool(newValue)}
            loading={loadingTools}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vyberte nástroj"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props}>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {option.category} • {option.inventory_code} • {option.sterilization_cost || 0} Kč/použití
                  </Typography>
                  {option.quantity < 5 && (
                    <Chip 
                      label={`Pouze ${option.quantity} ks`} 
                      size="small" 
                      color="warning"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Box>
              </li>
            )}
          />

          <TextField
            type="number"
            label="Množství"
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            inputProps={{ min: 1 }}
            sx={{ width: 120 }}
          />

          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!selectedTool || loading}
          >
            {loading ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
            Přidat
          </Button>
        </Box>

        {selectedTool && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Náklady: {quantity} × {selectedTool.sterilization_cost || 0} Kč = {
              (quantity * (selectedTool.sterilization_cost || 0)).toLocaleString('cs-CZ')
            } Kč
          </Alert>
        )}
      </Paper>

      {/* Seznam použitých nástrojů */}
      {costSummary && costSummary.tools_details && costSummary.tools_details.length > 0 && (
        <Box>
          <Typography variant="subtitle1" gutterBottom>
            Použité nástroje
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Název</TableCell>
                  <TableCell>Kategorie</TableCell>
                  <TableCell>Inventární kód</TableCell>
                  <TableCell align="right">Cena sterilizace</TableCell>
                  <TableCell align="right">Množství</TableCell>
                  <TableCell align="right">Celkem</TableCell>
                  <TableCell align="center">Akce</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costSummary.tools_details.map((tool, index) => (
                  <TableRow key={index}>
                    <TableCell>{tool.name}</TableCell>
                    <TableCell>{tool.category}</TableCell>
                    <TableCell>{tool.inventory_code}</TableCell>
                    <TableCell align="right">
                      {parseFloat(tool.sterilization_cost).toLocaleString('cs-CZ')} Kč
                    </TableCell>
                    <TableCell align="right">{tool.quantity}×</TableCell>
                    <TableCell align="right">
                      <strong>{parseFloat(tool.total_cost).toLocaleString('cs-CZ')} Kč</strong>
                    </TableCell>
                    <TableCell align="center">
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => handleRemove(tool.tool_id)}
                      >
                        Odebrat
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={5} align="right">
                    <strong>Celkem nástroje:</strong>
                  </TableCell>
                  <TableCell align="right">
                    <strong style={{ color: '#1976d2', fontSize: '1.1em' }}>
                      {getTotalToolsCost().toLocaleString('cs-CZ')} Kč
                    </strong>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {(!costSummary || !costSummary.tools_details || costSummary.tools_details.length === 0) && (
        <Alert severity="info">
          Zatím nebyly přidány žádné nástroje.
        </Alert>
      )}
    </Box>
  );
}
