import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { DatabaseService } from '../services/DatabaseService';
import AOS from 'aos';
import 'aos/dist/aos.css';

interface ChartData {
  mpgDistribution: any;
  cylindersMpgCorrelation: any;
  originDistribution: any;
  yearlyTrends: any;
  weightMpgCorrelation: any;
  horsepowerByMake: any;
}

interface Message {
  isAI: boolean;
  content: string;
  capabilities?: string[];
}

const InsightsPage = () => {
  const [messages, setMessages] = useState<Message[]>([{
    isAI: true,
    content: "Hello! I'm your AI assistant. I can help you analyze:",
    capabilities: [
      'MPG Distribution Analysis',
      'Performance Metrics Correlation',
      'Geographic Distribution',
      'Historical Trends',
      'Custom Data Visualizations'
    ]
  }]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);

  // Chart refs
  const mpgDistributionRef = useRef<HTMLCanvasElement>(null);
  const cylindersMpgRef = useRef<HTMLCanvasElement>(null);
  const originDistributionRef = useRef<HTMLCanvasElement>(null);
  const yearlyTrendsRef = useRef<HTMLCanvasElement>(null);
  const weightMpgRef = useRef<HTMLCanvasElement>(null);
  const horsepowerByMakeRef = useRef<HTMLCanvasElement>(null);

  // Chart instances
  const chartInstances = useRef<{[key: string]: Chart | null}>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch car data
      const tableData = await DatabaseService.getTableData(1, 1, 1000000);
      
      // Process data for charts
      const data = tableData.data.map(item => item.row_data);
      
      // MPG Distribution
      const mpgCounts = data.reduce((acc: {[key: string]: number}, car) => {
        const mpgRange = Math.floor(car.mpg / 5) * 5;
        acc[`${mpgRange}-${mpgRange + 5}`] = (acc[`${mpgRange}-${mpgRange + 5}`] || 0) + 1;
        return acc;
      }, {});

      // Cylinders vs MPG
      const cylindersMpg = data.reduce((acc: {[key: number]: number[]}, car) => {
        if (!acc[car.cylinders]) acc[car.cylinders] = [];
        acc[car.cylinders].push(car.mpg);
        return acc;
      }, {});

      // Origin Distribution
      const originCounts = data.reduce((acc: {[key: string]: number}, car) => {
        acc[car.origin] = (acc[car.origin] || 0) + 1;
        return acc;
      }, {});

      // Yearly Trends
      const yearlyAvgMpg = data.reduce((acc: {[key: number]: {sum: number, count: number}}, car) => {
        if (!acc[car.model_year]) acc[car.model_year] = {sum: 0, count: 0};
        acc[car.model_year].sum += car.mpg;
        acc[car.model_year].count += 1;
        return acc;
      }, {});

      // Weight vs MPG
      const weightMpg = data.map(car => ({
        x: car.weight,
        y: car.mpg
      }));

      // Horsepower by Make
      const horsepowerByMake = data.reduce((acc: {[key: string]: {sum: number, count: number}}, car) => {
        const make = car.name.split(' ')[0];
        if (!acc[make]) acc[make] = {sum: 0, count: 0};
        acc[make].sum += car.horsepower;
        acc[make].count += 1;
        return acc;
      }, {});

      setChartData({
        mpgDistribution: {
          labels: Object.keys(mpgCounts),
          datasets: [{
            label: 'Number of Cars',
            data: Object.values(mpgCounts),
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1
          }]
        },
        cylindersMpgCorrelation: {
          labels: Object.keys(cylindersMpg),
          datasets: [{
            label: 'Average MPG',
            data: Object.entries(cylindersMpg).map(([cyl, mpgs]) => ({
              x: cyl,
              y: mpgs.reduce((a, b) => a + b, 0) / mpgs.length
            })),
            backgroundColor: 'rgba(147, 51, 234, 0.5)',
            borderColor: 'rgb(147, 51, 234)',
            borderWidth: 1
          }]
        },
        originDistribution: {
          labels: Object.keys(originCounts),
          datasets: [{
            label: 'Number of Cars',
            data: Object.values(originCounts),
            backgroundColor: [
              'rgba(59, 130, 246, 0.5)',
              'rgba(147, 51, 234, 0.5)',
              'rgba(234, 88, 12, 0.5)'
            ]
          }]
        },
        yearlyTrends: {
          labels: Object.keys(yearlyAvgMpg),
          datasets: [{
            label: 'Average MPG',
            data: Object.entries(yearlyAvgMpg).map(([year, data]) => ({
              x: year,
              y: data.sum / data.count
            })),
            borderColor: 'rgb(234, 88, 12)',
            tension: 0.1
          }]
        },
        weightMpgCorrelation: {
          datasets: [{
            label: 'Weight vs MPG',
            data: weightMpg,
            backgroundColor: 'rgba(59, 130, 246, 0.5)'
          }]
        },
        horsepowerByMake: {
          labels: Object.keys(horsepowerByMake),
          datasets: [{
            label: 'Average Horsepower',
            data: Object.entries(horsepowerByMake).map(([make, data]) => data.sum / data.count),
            backgroundColor: 'rgba(234, 88, 12, 0.5)',
            borderColor: 'rgb(234, 88, 12)',
            borderWidth: 1
          }]
        }
      });
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initialize AOS
    AOS.init({
      duration: 800,
      once: true
    });

    fetchData();
  }, []);

  useEffect(() => {
    if (!chartData || loading) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: {
            color: isDarkMode ? '#9CA3AF' : '#4B5563'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: isDarkMode ? '#9CA3AF' : '#4B5563'
          }
        },
        y: {
          grid: {
            color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: isDarkMode ? '#9CA3AF' : '#4B5563'
          }
        }
      }
    };

    // Initialize/update charts
    const initChart = (ref: HTMLCanvasElement | null, data: any, type: string, options = {}) => {
      if (!ref) return null;
      const ctx = ref.getContext('2d');
      if (!ctx) return null;

      if (chartInstances.current[type]) {
        chartInstances.current[type]?.destroy();
      }

      chartInstances.current[type] = new Chart(ctx, {
        type,
        data,
        options: { ...commonOptions, ...options }
      });
    };

    // Initialize all charts
    initChart(mpgDistributionRef.current, chartData.mpgDistribution, 'bar');
    initChart(cylindersMpgRef.current, chartData.cylindersMpgCorrelation, 'scatter');
    initChart(originDistributionRef.current, chartData.originDistribution, 'pie');
    initChart(yearlyTrendsRef.current, chartData.yearlyTrends, 'line');
    initChart(weightMpgRef.current, chartData.weightMpgCorrelation, 'scatter');
    initChart(horsepowerByMakeRef.current, chartData.horsepowerByMake, 'bar');

    // Cleanup function
    return () => {
      Object.values(chartInstances.current).forEach(chart => chart?.destroy());
    };
  }, [chartData, loading]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    
    setMessages(prev => [...prev, { isAI: false, content: inputMessage }]);
    setInputMessage('');
    // Here you would typically handle the AI response
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* MPG Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">MPG Distribution</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={mpgDistributionRef}></canvas>
            </div>
          </div>

          {/* Cylinders vs MPG */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Cylinders vs MPG</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={cylindersMpgRef}></canvas>
            </div>
          </div>

          {/* Origin Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Cars by Origin</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={originDistributionRef}></canvas>
            </div>
          </div>

          {/* Yearly Trends */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">MPG Trends by Year</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={yearlyTrendsRef}></canvas>
            </div>
          </div>

          {/* Weight vs MPG */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Weight vs MPG</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={weightMpgRef}></canvas>
            </div>
          </div>

          {/* Horsepower by Make */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6" data-aos="fade-up">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Average Horsepower by Make</h3>
            <div className="relative w-full h-[300px]">
              <canvas ref={horsepowerByMakeRef}></canvas>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage; 