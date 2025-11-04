// src/components/ResearchCards.tsx
import React from 'react';
import { ResearchProgress, ResearchFinished, ResearchSummary } from '../types';
import './ResearchCards.css';

interface ResearchCardsProps {
  researchProgress?: ResearchProgress;
  researchFinished?: ResearchFinished;
  researchSummary?: ResearchSummary;
  loading?: boolean;
  error?: string;
}

// Loading Skeleton Components
const ResearchCardSkeleton: React.FC<{ type: 'summary' | 'current' | 'finished' }> = ({ type }) => {
  return (
    <div className={`research-card skeleton ${type}-skeleton`}>
      <div className="research-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-badge"></div>
      </div>
      <div className="research-content">
        <div className="skeleton-content"></div>
        <div className="skeleton-content short"></div>
        <div className="skeleton-content"></div>
      </div>
    </div>
  );
};

export const CurrentResearchCard: React.FC<{ research: ResearchProgress; loading?: boolean }> = ({
  research,
  loading
}) => {
  if (loading) return <ResearchCardSkeleton type="current" />;

  const hasActiveResearch = research.name && research.name !== 'None' && !research.is_finished;
  const isFinished = research.is_finished;
  const canStart = research.can_start_now && research.player_has_any_appropriate_research_bench;

  return (
    <div className="research-card current-research" role="region" aria-label="Current Research Project">
      <div className="research-header">
        <h3>Current Research</h3>
        <div className={`research-status ${isFinished ? 'finished' :
          hasActiveResearch ? 'active' :
            canStart ? 'available' : 'idle'
          }`} aria-live="polite">
          {isFinished ? '✅ Finished' :
            hasActiveResearch ? '🔬 Researching' :
              canStart ? '🚀 Available' : '💤 Idle'}
        </div>
      </div>
      <div className="research-content">
        {hasActiveResearch || isFinished ? (
          <>
            <div className="research-project">
              <h4 className="project-name">{formatResearchName(research.name)}</h4>
              <p className="research-description">{research.description}</p>

              {!isFinished && (
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    role="progressbar"
                    aria-valuenow={Math.round(research.progress_percent * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="progress-fill"
                      style={{ width: `${research.progress_percent * 100}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">
                    {Math.round(research.progress_percent * 100)}%
                  </span>
                </div>
              )}

              {isFinished && (
                <div className="completion-badge" role="status">
                  ✅ Research Complete
                </div>
              )}
            </div>
            <div className="research-details">
              <div className="research-detail-item">
                <span className="detail-label">Tech Level:</span>
                <span className="detail-value">{research.tech_level}</span>
              </div>
              <div className="research-detail-item">
                <span className="detail-label">Research Points:</span>
                <span className="detail-value">{research.research_points}</span>
              </div>
              {research.required_analyzed_thing_count > 0 && (
                <div className="research-detail-item">
                  <span className="detail-label">Analysis:</span>
                  <span className="detail-value">
                    {research.analyzed_things_completed}/{research.required_analyzed_thing_count}
                  </span>
                </div>
              )}
              {research.prerequisites.length > 0 && (
                <div className="research-detail-item">
                  <span className="detail-label">Requires:</span>
                  <span className="detail-value">
                    {research.prerequisites.map(p => formatResearchName(p)).join(', ')}
                  </span>
                </div>
              )}
              {!research.player_has_any_appropriate_research_bench && (
                <div className="research-warning" role="alert">
                  ⚠️ No research bench available
                </div>
              )}
            </div>
          </>
        ) : canStart ? (
          <div className="available-research">
            <div className="available-research-icon">📚</div>
            <h4>Research Available</h4>
            <p className="research-description">{research.description}</p>
            <div className="research-details">
              <div className="research-detail-item">
                <span className="detail-label">Tech Level:</span>
                <span className="detail-value">{research.tech_level}</span>
              </div>
              <div className="research-detail-item">
                <span className="detail-label">Research Points:</span>
                <span className="detail-value">{research.research_points}</span>
              </div>
            </div>
            {!research.player_has_any_appropriate_research_bench && (
              <div className="research-warning" role="alert">
                ⚠️ Build appropriate research bench to start
              </div>
            )}
          </div>
        ) : (
          <div className="no-research">
            <div className="no-research-icon">📚</div>
            <p>No active research project</p>
            <span className="no-research-hint">Assign a researcher to start a project</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const FinishedResearchCard: React.FC<{ research: ResearchFinished; loading?: boolean }> = ({
  research,
  loading
}) => {
  if (loading) return <ResearchCardSkeleton type="finished" />;

  return (
    <div className="research-card finished-research full-width" role="region" aria-label="Completed Research Projects">
      <div className="research-header">
        <h3>Completed Research</h3>
        <div className="research-count">
          {research.finished_projects.length} Projects
        </div>
      </div>
      <div className="research-content">
        {research.finished_projects.length > 0 ? (
          <div className="projects-grid">
            {research.finished_projects.map((project, index) => (
              <div key={index} className="research-project-item" tabIndex={0}>
                <span className="project-icon" aria-hidden="true">✅</span>
                <span className="project-name" title={project}>
                  {formatResearchName(project)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-research">
            <div className="no-research-icon">🏛️</div>
            <p>No research completed yet</p>
            <span className="no-research-hint">Research projects will appear here when completed</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ResearchSummaryCard: React.FC<{ research: ResearchSummary; loading?: boolean }> = ({
  research,
  loading
}) => {
  if (loading) return <ResearchCardSkeleton type="summary" />;

  const overallProgress = research.total_projects_count > 0
    ? (research.finished_projects_count / research.total_projects_count) * 100
    : 0;

  return (
    <div className="research-card research-summary span-2" role="region" aria-label="Research Overview">
      <div className="research-header">
        <h3>Research Overview</h3>
        <div className="research-count">
          {research.finished_projects_count}/{research.total_projects_count} Complete
        </div>
      </div>
      <div className="research-content">
        <div className="research-summary-layout">
          {/* Overall Progress Section */}
          <div className="overall-progress-section">
            <div className="progress-stats">
              <div className="stat-item">
                <span className="stat-value">{research.finished_projects_count}</span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{research.available_projects_count}</span>
                <span className="stat-label">Available</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{research.total_projects_count}</span>
                <span className="stat-label">Total</span>
              </div>
            </div>

            <div className="overall-progress">
              <div className="progress-header">
                <span className="progress-label">Total Research Progress</span>
                <span className="progress-percent">{overallProgress.toFixed(1)}%</span>
              </div>
              <div
                className="progress-bar large"
                role="progressbar"
                aria-valuenow={overallProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="progress-fill"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TechProgressCard: React.FC<{ research: ResearchSummary; loading?: boolean }> = ({
  research,
  loading
}) => {
  if (loading) return <ResearchCardSkeleton type="summary" />;

  return (
    <div className="research-card tech-progress span-2" role="region" aria-label="Technology Progress by Level">
      <div className="research-header">
        <h3>Technology Progress</h3>
        <div className="research-count">
          {Object.keys(research.by_tech_level).length} Tech Levels
        </div>
      </div>
      <div className="research-content">
        {Object.keys(research.by_tech_level).length > 0 ? (
          <div className="tech-levels-grid">
            {Object.entries(research.by_tech_level).map(([techLevel, data], index) => (
              <div key={techLevel} className="tech-level-item">
                <div className="tech-level-header">
                  <span className="tech-level-name">{formatTechLevelName(techLevel)}</span>
                  <span className="tech-level-percent">{data.percent_complete.toFixed(1)}%</span>
                </div>
                <div
                  className="progress-bar small"
                  role="progressbar"
                  aria-valuenow={data.percent_complete}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${data.percent_complete}%` }}
                  ></div>
                </div>
                <div className="tech-level-stats">
                  <span className="tech-level-completion">
                    {data.finished}/{data.total}
                  </span>
                  <span className="tech-level-projects">
                    {data.projects.length} projects
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-research">
            <div className="no-research-icon">🔬</div>
            <p>No technology data available</p>
            <span className="no-research-hint">Research progress will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
};

const ResearchCards: React.FC<ResearchCardsProps> = ({
  researchProgress,
  researchFinished,
  researchSummary,
  loading = false,
  error
}) => {
  if (error) {
    return (
      <div className="research-dashboard error-state" role="alert">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Research Data</h3>
          <p>{error}</p>
          <button className="retry-button">Retry</button>
        </div>
      </div>
    );
  }

  const progress = researchProgress || {
    name: "null",
    label: "null",
    progress: 0,
    research_points: 0,
    description: "null",
    is_finished: false,
    can_start_now: false,
    player_has_any_appropriate_research_bench: false,
    required_analyzed_thing_count: 0,
    analyzed_things_completed: 0,
    tech_level: "null",
    prerequisites: [],
    hidden_prerequisites: [],
    required_by_this: [],
    progress_percent: 0,
  };

  const finished = researchFinished || { finished_projects: [] };
  const summary = researchSummary || {
    finished_projects_count: 0,
    total_projects_count: 0,
    available_projects_count: 0,
    by_tech_level: {},
    by_tab: {}
  };

  return (
    <div className="research-dashboard">
      <ResearchSummaryCard research={summary} loading={loading} />
      <CurrentResearchCard research={progress} loading={loading} />
      <TechProgressCard research={summary} loading={loading} />
      <FinishedResearchCard research={finished} loading={loading} />
    </div>
  );
};

const formatTechLevelName = (techLevel: string): string => {
  return techLevel
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

const formatResearchName = (projectName: string): string => {
  return projectName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

export default ResearchCards;