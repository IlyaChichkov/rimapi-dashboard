// src/components/ResponsiveChartWrapper.tsx
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Chart as ChartJS } from 'chart.js';

interface ResponsiveChartWrapperProps {
    children: React.ReactElement;
    className?: string;
}

// Define the ref interface for the wrapper
export interface ResponsiveChartWrapperRef {
    resizeChart: () => void;
}

// Use forwardRef to handle ref forwarding
export const ResponsiveChartWrapper = forwardRef<ResponsiveChartWrapperRef, ResponsiveChartWrapperProps>(({
    children,
    className = ''
}, ref) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<ChartJS | null>(null);
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Expose resize function via ref
    useImperativeHandle(ref, () => ({
        resizeChart: () => {
            if (chartRef.current) {
                chartRef.current.resize();
                chartRef.current.update('none');
            }
        }
    }));

    useEffect(() => {
        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            resizeTimeoutRef.current = setTimeout(() => {
                if (chartRef.current) {
                    chartRef.current.resize();
                    chartRef.current.update('none');
                }
            }, 100);
        };

        const currentWrapper = wrapperRef.current;
        if (currentWrapper) {
            const observer = new ResizeObserver(handleResize);
            observer.observe(currentWrapper);

            // Initial resize
            setTimeout(() => {
                if (chartRef.current) {
                    chartRef.current.resize();
                    chartRef.current.update('none');
                }
            }, 200);

            return () => {
                if (currentWrapper) {
                    observer.unobserve(currentWrapper);
                }
                if (resizeTimeoutRef.current) {
                    clearTimeout(resizeTimeoutRef.current);
                }
            };
        }
    }, []);

    // Clone the child to inject chart ref via props
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            // Chart.js components typically accept a ref via forwardRef
            // We'll pass the ref as a prop instead
            return React.cloneElement(child as React.ReactElement<any>, {
                // Pass a callback to get the chart instance
                onChartCreated: (chart: ChartJS) => {
                    chartRef.current = chart;
                }
            });
        }
        return child;
    });

    return (
        <div ref={wrapperRef} className={`responsive-chart-wrapper ${className}`} style={{ width: '100%', height: '100%' }}>
            {childrenWithProps}
        </div>
    );
});

ResponsiveChartWrapper.displayName = 'ResponsiveChartWrapper';