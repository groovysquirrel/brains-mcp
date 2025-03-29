import './css/Help.css';
import { useState, useEffect, useCallback } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  TextField, 
  Button,
  IconButton,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MoodData {
  id: string;
  label: string;
  value: number;
  percentage: number;
}

const Help = () => {
  const [moodData, setMoodData] = useState<MoodData[]>([
    { id: '1', label: 'Happy People', value: 40, percentage: 40 },
    { id: '2', label: 'Angry People', value: 20, percentage: 20 },
    { id: '3', label: 'So-so People', value: 20, percentage: 20 },
    { id: '4', label: 'Unknown', value: 20, percentage: 20 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculatePercentages = (data: MoodData[]): MoodData[] => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return data.map(item => ({
      ...item,
      percentage: total === 0 ? 0 : (item.value / total) * 100
    }));
  };

  const handleValueChange = (id: string, newValue: string) => {
    // Validate input
    if (newValue !== '' && !/^\d*\.?\d*$/.test(newValue)) {
      setError('Please enter valid numbers only');
      return;
    }

    const numericValue = newValue === '' ? 0 : parseFloat(newValue);
    if (numericValue < 0) {
      setError('Negative numbers are not allowed');
      return;
    }

    setError(null);
    setMoodData(prev => {
      const updated = prev.map(item => 
        item.id === id ? { ...item, value: numericValue } : item
      );
      return calculatePercentages(updated);
    });
  };

  const handleLabelChange = (id: string, newLabel: string) => {
    setMoodData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, label: newLabel } : item
      )
    );
  };

  const addNewRow = () => {
    const newId = (Math.max(...moodData.map(d => parseInt(d.id))) + 1).toString();
    setMoodData(prev => calculatePercentages([
      ...prev,
      { id: newId, label: 'New Category', value: 0, percentage: 0 }
    ]));
  };

  const deleteRow = (id: string) => {
    if (moodData.length <= 1) {
      setError('Cannot delete the last row');
      return;
    }
    setMoodData(prev => calculatePercentages(prev.filter(item => item.id !== id)));
  };

  const processCSVData = (csvText: string) => {
    try {
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      // Validate headers
      if (headers[0]?.trim() !== 'Category' || headers[1]?.trim() !== 'Value') {
        throw new Error('Invalid CSV format. Expected headers: Category,Value');
      }

      const newData: MoodData[] = [];
      let hasErrors = false;
      let errorMessages: string[] = [];

      lines.slice(1).forEach((line, index) => {
        if (!line.trim()) return; // Skip empty lines
        
        const [category, valueStr] = line.split(',').map(str => str.trim());
        
        if (!category) {
          errorMessages.push(`Row ${index + 2}: Missing category`);
          hasErrors = true;
          return;
        }

        const value = parseFloat(valueStr);
        if (isNaN(value)) {
          errorMessages.push(`Row ${index + 2}: Invalid value "${valueStr}" for category "${category}"`);
          hasErrors = true;
          return;
        }

        if (value < 0) {
          errorMessages.push(`Row ${index + 2}: Negative value not allowed for category "${category}"`);
          hasErrors = true;
          return;
        }

        newData.push({
          id: (index + 1).toString(),
          label: category,
          value: value,
          percentage: 0 // Will be calculated later
        });
      });

      if (hasErrors) {
        throw new Error('CSV validation failed:\n' + errorMessages.join('\n'));
      }

      if (newData.length === 0) {
        throw new Error('No valid data found in CSV');
      }

      setMoodData(calculatePercentages(newData));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process CSV file');
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please drop a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        processCSVData(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file');
    };
    reader.readAsText(file);
  }, []);

  const chartData = {
    labels: moodData.map(d => d.label),
    datasets: [
      {
        data: moodData.map(d => d.percentage),
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(201, 203, 207, 0.8)',
          // Additional colors for new rows
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(201, 203, 207, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'People Mood Distribution',
      },
    },
  };

  return (
    <div className="resources">
      <div className="resource-header-container">
          <h1 className="title">Help Center (PLACEHOLDER)</h1>
          <p className="intro">
            Here you can explore the different types of models that the B.R.A.I.N.S. platform supports.
            Each model type offers unique ways to structure reasoning and enhance interactions with AI.
          </p>

          <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    border: `2px dashed ${isDragging ? '#2196f3' : '#ccc'}`,
                    borderRadius: '4px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: isDragging ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <CloudUploadIcon color={isDragging ? 'primary' : 'action'} />
                  <span>Drop CSV file here</span>
                </div>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Category</TableCell>
                        <TableCell align="right">Value</TableCell>
                        <TableCell align="right">Percentage</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {moodData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <TextField
                              size="small"
                              value={row.label}
                              onChange={(e) => handleLabelChange(row.id, e.target.value)}
                              style={{ width: '180px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <TextField
                              size="small"
                              type="text"
                              value={row.value}
                              onChange={(e) => handleValueChange(row.id, e.target.value)}
                              error={!!error}
                              style={{ width: '80px' }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {row.percentage.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            <IconButton 
                              size="small" 
                              onClick={() => deleteRow(row.id)}
                              disabled={moodData.length <= 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addNewRow}
                  style={{ marginTop: '1rem' }}
                >
                  Add Category
                </Button>
                {error && (
                  <Alert severity="error" style={{ marginTop: '1rem' }}>
                    {error}
                  </Alert>
                )}
              </div>
              <div style={{ width: '400px' }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
      </div>

      <div className="model-container">
        <h2>Principles</h2>
        <p>
          Several design principles guide the creation of models in B.R.A.I.N.S.
        </p>
      </div>
      
      <ul className="model-links">
        <li><a href="#workflow">Workflow Model</a></li>
        <li><a href="#logic-diagram">Logic Diagram</a></li>
        <li><a href="#abstraction-hierarchy">Abstraction Hierarchy</a></li>
      </ul>

      <div id="workflow" className="model-section">
        <h4>Workflow Model</h4>
        <p>
          Workflow models outline the sequence of steps necessary to achieve a specific outcome. They are 
          ideal for breaking down complex processes into manageable stages.
          <a href="https://en.wikipedia.org/wiki/Workflow" target="_blank" rel="noopener noreferrer">Learn more on Wikipedia</a>
        </p>
        <ul className="model-uses">
          <li>Business process automation</li>
          <li>Step-by-step task guides</li>
          <li>Training procedural tasks</li>
          <li>Mapping AI-driven task flows</li>
        </ul>
      </div>

      <div id="logic-diagram" className="model-section">
        <h4>Logic Diagram</h4>
        <p>
          Logic diagrams illustrate logical relationships between concepts or objects, making them ideal 
          for reasoning and decision-making processes.
          <a href="https://en.wikipedia.org/wiki/Logic_diagram" target="_blank" rel="noopener noreferrer">Learn more on Wikipedia</a>
        </p>
        <ul className="model-uses">
          <li>Decision-making frameworks</li>
          <li>Conditional processes</li>
          <li>Structuring reasoning steps for AI</li>
          <li>Mapping dependencies in complex scenarios</li>
        </ul>
      </div>

      <div id="abstraction-hierarchy" className="model-section">
        <h4>Abstraction Hierarchy</h4>
        <p>
          Abstraction hierarchies help in organizing systems by levels of abstraction, which is particularly
          useful for understanding layered systems.
          <a href="https://en.wikipedia.org/wiki/Abstraction_hierarchy" target="_blank" rel="noopener noreferrer">Learn more on Wikipedia</a>
        </p>
        <ul className="model-uses">
          <li>System architecture design</li>
          <li>Layered problem-solving</li>
          <li>Creating AI with hierarchical logic</li>
          <li>Abstracting data models for simplified analysis</li>
        </ul>
      </div>
    </div>
  );
};

export default Help;
