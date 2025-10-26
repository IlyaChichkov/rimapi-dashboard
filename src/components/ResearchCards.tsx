// src/components/ResearchCards.tsx
import React from 'react';
import { ResearchProgress, ResearchFinished, ResearchSummary } from '../types';
import './ResearchCards.css';

interface ResearchCardsProps {
  researchProgress?: ResearchProgress;
  researchFinished?: ResearchFinished;
  loading?: boolean;
}

export const CurrentResearchCard: React.FC<{ research: ResearchProgress; loading?: boolean }> = ({ 
  research, 
  loading 
}) => {
  const hasActiveResearch = research.name && research.name !== 'None' && !research.is_finished;
  const isFinished = research.is_finished;
  const canStart = research.can_start_now && research.player_has_any_appropriate_research_bench;

  return (
    <div className="research-card current-research">
      <div className="research-header">
        <h3>Current Research</h3>
        <div className={`research-status ${
          isFinished ? 'finished' : 
          hasActiveResearch ? 'active' : 
          canStart ? 'available' : 'idle'
        }`}>
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
                  <div className="progress-bar">
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
                <div className="completion-badge">
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
                <div className="research-warning">
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
              <div className="research-warning">
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

  return (
    <div className="research-card finished-research">
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
              <div key={index} className="research-project-item">
                <span className="project-icon">✅</span>
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

// Update the ResearchSummaryCard in src/components/ResearchCards.tsx
export const ResearchSummaryCard: React.FC<{ research: ResearchSummary; loading?: boolean; isLarge?: boolean }> = ({ 
  research, 
  loading,
  isLarge = false
}) => {
  const overallProgress = research.total_projects_count > 0 
    ? (research.finished_projects_count / research.total_projects_count) * 100 
    : 0;

  return (
    <div className={`research-card research-summary ${isLarge ? 'large-layout' : ''}`}>
      <div className="research-header">
        <h3>Research Overview</h3>
        <div className="research-count">
          {research.finished_projects_count}/{research.total_projects_count} Complete
        </div>
      </div>
      <div className="research-content">
        <div className="research-summary-layout">
          {/* Left Column - Overall Progress */}
          <div className="overall-progress-column">
            <div className="tech-summary">
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
              <div className="progress-bar large">
                <div 
                  className="progress-fill"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>

            </div>
          </div>

          {/* Right Column - Tech Level Breakdown */}
          {Object.keys(research.by_tech_level).length > 0 && (
            <div className="tech-level-column">
              <div className="tech-level-breakdown">
                <h4>Progress by Tech Level</h4>
                <div className="tech-levels-grid">
                  {Object.entries(research.by_tech_level).map(([techLevel, data]) => (
                    <div key={techLevel} className="tech-level-item">
                      <div className="tech-level-header">
                        <span className="tech-level-name">{formatTechLevelName(techLevel)}</span>
                        <span className="tech-level-percent">{data.percent_complete.toFixed(1)}%</span>
                      </div>
                      <div className="progress-bar small">
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
              </div>
            </div>
          )}
        </div>
      </div>
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
  // Convert camelCase to spaced words
  return projectName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

interface ResearchCardsProps {
  researchProgress?: ResearchProgress;
  researchFinished?: ResearchFinished;
  researchSummary?: ResearchSummary;
  loading?: boolean;
}

// Update the ResearchCards usage to pass isLarge prop
const ResearchCards: React.FC<ResearchCardsProps> = ({ 
  researchProgress, 
  researchFinished, 
  researchSummary,
  loading = false 
}) => {
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
    <>
      <ResearchSummaryCard 
        research={summary} 
        loading={loading} 
        isLarge={true} 
      />
      <CurrentResearchCard research={progress} loading={loading} />
      <FinishedResearchCard research={finished} loading={loading} />
    </>
  );
};

export default ResearchCards;