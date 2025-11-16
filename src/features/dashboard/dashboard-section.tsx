'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useRef, useState, type ReactNode } from 'react';

import { Card, CardBody, CardHeader } from '@components/dashboard/card';

import styles from './dashboard-section.module.css';
import {
  getWidgetColumn,
  useDashboardLayout,
  type DashboardColumnKey,
  type DashboardLayout,
  type DashboardWidgetId,
} from './use-dashboard-layout';
import { useDashboardOverview } from './use-dashboard-overview';
import controls from '../../styles/controls.module.css';
import patterns from '../../styles/patterns.module.css';

import type {
  DashboardMonthlySummary,
  DashboardOverviewPayload,
  GoalStatus,
} from '@lib/api/dashboard';

type AlertTone = DashboardOverviewPayload['alerts'][number]['tone'];

const varianceToneClass: Record<DashboardMonthlySummary['variance']['tone'], string> = {
  positive: styles.summaryPositive,

  negative: styles.summaryNegative,
};

const alertToneClassName: Record<AlertTone, string> = {
  info: styles.alertInfo,

  warn: styles.alertWarn,

  danger: styles.alertDanger,

  success: styles.alertSuccess,
};

const columnLabel: Record<DashboardColumnKey, string> = {
  primary: 'Primary insights',

  secondary: 'Supporting insights',
};

const widgetLabelMap: Record<DashboardWidgetId, string> = {
  'spending-summary': 'Spending summary',

  'financial-goals': 'Financial goals',

  'recent-transactions': 'Recent transactions',

  'alerts-reminders': 'Alerts & reminders',

  'quick-actions': 'Quick actions',
};

const goalStatusLabel: Record<GoalStatus, string> = {
  ahead: 'Ahead of plan',

  onTrack: 'On track',

  behind: 'Needs attention',
};

const goalStatusToneClass: Record<GoalStatus, string> = {
  ahead: styles.goalStatusPositive,

  onTrack: styles.goalStatusNeutral,

  behind: styles.goalStatusWarn,
};

function clampGoalProgress(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(1, value));
}

function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return {
    primary: [...layout.primary],

    secondary: [...layout.secondary],
  };
}

interface DashboardColumnProps {
  column: DashboardColumnKey;

  items: DashboardWidgetId[];

  isCustomizing: boolean;

  children: ReactNode;
}

function DashboardColumn({ column, items, isCustomizing, children }: DashboardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column,

    data: { type: 'column', column },

    disabled: !isCustomizing,
  });

  const className = [
    column === 'primary' ? styles.primaryColumn : styles.secondaryColumn,

    isCustomizing ? styles.columnCustomizing : '',

    isCustomizing && isOver ? styles.columnCustomizingActive : '',
  ]

    .filter(Boolean)

    .join(' ');

  return (
    <div
      ref={setNodeRef}
      className={className}
      data-column={column}
      aria-label={isCustomizing ? `${columnLabel[column]} drop zone` : undefined}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  );
}

interface SortableWidgetProps {
  widgetId: DashboardWidgetId;

  column: DashboardColumnKey;

  label: string;

  isCustomizing: boolean;

  children: ReactNode;
}

function SortableWidget({ widgetId, column, label, isCustomizing, children }: SortableWidgetProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widgetId,

    data: { type: 'widget', widgetId, column },

    disabled: !isCustomizing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),

    transition,
  };

  const wrapperClasses = [
    styles.widgetWrapper,

    isCustomizing ? styles.widgetWrapperEditing : '',

    isDragging ? styles.widgetWrapperDragging : '',
  ]

    .filter(Boolean)

    .join(' ');

  const contentClassName = isCustomizing ? styles.widgetContentEditing : undefined;

  return (
    <div ref={setNodeRef} style={style} className={wrapperClasses} data-widget-id={widgetId}>
      {isCustomizing ? (
        <button
          type="button"
          className={styles.widgetHandle}
          aria-label={`Reposition ${label}`}
          {...attributes}
          {...listeners}
        >
          <span aria-hidden="true" className={styles.widgetHandleIcon}>
            ::
          </span>

          {label}
        </button>
      ) : null}

      <div className={contentClassName}>{children}</div>
    </div>
  );
}

export function DashboardSection() {
  const { data, isLoading } = useDashboardOverview();

  const { layout, setLayout, resetLayout, isHydrated } = useDashboardLayout();

  const [isCustomizing, setIsCustomizing] = useState(false);

  const [activeWidget, setActiveWidget] = useState<DashboardWidgetId | null>(null);

  const previousLayoutRef = useRef<DashboardLayout | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),

    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleStartCustomizing = () => {
    previousLayoutRef.current = cloneLayout(layout);

    setIsCustomizing(true);
  };

  const handleCancelCustomizing = () => {
    if (previousLayoutRef.current) {
      setLayout(previousLayoutRef.current);
    }

    previousLayoutRef.current = null;

    setIsCustomizing(false);
  };

  const handleFinishCustomizing = () => {
    previousLayoutRef.current = null;

    setIsCustomizing(false);
  };

  const handleResetLayout = () => {
    resetLayout();
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!isCustomizing) {
      return;
    }

    setActiveWidget(event.active.id as DashboardWidgetId);
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    if (!isCustomizing) {
      return;
    }

    if (event.active) {
      setActiveWidget(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!isCustomizing) {
      return;
    }

    const { active, over } = event;

    setActiveWidget(null);

    if (!over) {
      return;
    }

    const activeId = active.id as DashboardWidgetId;

    const sourceColumn = getWidgetColumn(layout, activeId);

    if (!sourceColumn) {
      return;
    }

    const overData = over.data?.current as
      | { type?: string; column?: DashboardColumnKey }
      | undefined;

    let targetColumn: DashboardColumnKey | null = null;

    let targetIndex = 0;

    if (overData?.type === 'column' && overData.column) {
      targetColumn = overData.column;

      targetIndex = layout[targetColumn].length;
    } else {
      const overId = over.id as DashboardWidgetId;

      targetColumn = getWidgetColumn(layout, overId);

      if (!targetColumn) {
        return;
      }

      targetIndex = layout[targetColumn].indexOf(overId);

      if (targetIndex === -1) {
        return;
      }
    }

    if (targetColumn === sourceColumn) {
      const currentIndex = layout[sourceColumn].indexOf(activeId);

      if (currentIndex === -1) {
        return;
      }

      if (overData?.type === 'column') {
        if (currentIndex === layout[sourceColumn].length - 1) {
          return;
        }

        setLayout((previous) => {
          const next = cloneLayout(previous);

          const list = next[sourceColumn];

          list.splice(currentIndex, 1);

          list.push(activeId);

          return next;
        });

        return;
      }

      if (currentIndex === targetIndex) {
        return;
      }

      setLayout((previous) => {
        const next = cloneLayout(previous);

        next[sourceColumn] = arrayMove(next[sourceColumn], currentIndex, targetIndex);

        return next;
      });

      return;
    }

    setLayout((previous) => {
      const next = cloneLayout(previous);

      const fromIndex = next[sourceColumn].indexOf(activeId);

      if (fromIndex === -1) {
        return previous;
      }

      next[sourceColumn].splice(fromIndex, 1);

      const targetItems = next[targetColumn];

      const insertIndex = overData?.type === 'column' ? targetItems.length : targetIndex;

      targetItems.splice(insertIndex, 0, activeId);

      return next;
    });
  };

  const widgetContentMap = useMemo<Record<DashboardWidgetId, ReactNode> | null>(() => {
    if (!data) {
      return null;
    }

    const { monthlySummary, categorySpending, goals, alerts, quickActions, recentTransactions } =
      data;

    const goalProgressPercent = goals.length
      ? Math.round(
          (goals.reduce((sum, goal) => sum + clampGoalProgress(goal.progress), 0) / goals.length) *
            100,
        )
      : 0;

    const goalSubtitle = goals.length
      ? `You are on track to meet ${goalProgressPercent}% of 2025 targets`
      : 'Set your first goal to start tracking your progress.';

    return {
      'spending-summary': (
        <Card>
          <CardHeader
            title="Spending summary"
            subtitle={monthlySummary.month}
            actions={
              <button type="button" className={controls.pill}>
                manage budgets
              </button>
            }
          />

          <CardBody className={styles.summaryBody}>
            <div className={styles.summaryTotals}>
              <div>
                <span className={styles.summaryLabel}>Budgeted</span>

                <strong className={styles.summaryValue}>{monthlySummary.budgeted}</strong>
              </div>

              <div>
                <span className={styles.summaryLabel}>Spent</span>

                <strong className={styles.summaryValue}>{monthlySummary.spent}</strong>
              </div>

              <div>
                <span className={styles.summaryLabel}>Remaining</span>

                <strong className={styles.summaryValue}>{monthlySummary.remaining}</strong>

                <span
                  className={`${styles.summaryDelta} ${varianceToneClass[monthlySummary.variance.tone]}`}
                >
                  {monthlySummary.variance.label}
                </span>
              </div>
            </div>

            <div className={styles.metricList}>
              {categorySpending.length ? (
                categorySpending.map((item) => (
                  <div key={item.label}>
                    <div className={styles.metricHeader}>
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                    <div className={patterns.progress}>
                      <span
                        className={`${patterns.progressBar} ${item.tone ? (item.tone === 'warn' ? patterns.progressWarn : patterns.progressDanger) : ''}`}
                        style={{ width: item.percent }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className={patterns.emptyState}>
                  Category insights will populate once transactions sync.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ),

      'financial-goals': (
        <Card>
          <CardHeader title="Financial goals" subtitle={goalSubtitle} />

          <CardBody className={styles.goalsBody}>
            {goals.length ? (
              <div className={styles.goalList}>
                {goals.map((goal) => {
                  const progressPercent = Math.round(clampGoalProgress(goal.progress) * 100);

                  const statusToneClass =
                    goalStatusToneClass[goal.status] ?? styles.goalStatusNeutral;

                  const statusLabel = goalStatusLabel[goal.status] ?? goal.status;

                  return (
                    <div key={goal.name} className={styles.goalItem}>
                      <div className={styles.goalHeader}>
                        <div>
                          <span className={styles.goalName}>{goal.name}</span>

                          <span className={styles.goalTarget}>{goal.target}</span>
                        </div>

                        <span className={`${styles.goalStatus} ${statusToneClass}`}>
                          {statusLabel}
                        </span>
                      </div>

                      <div className={patterns.progress}>
                        <span
                          className={patterns.progressBar}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      <span className={styles.goalProgressLabel}>{progressPercent}% complete</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className={styles.goalEmpty}>
                Set your first goal to start tracking your progress.
              </p>
            )}
          </CardBody>
        </Card>
      ),

      'recent-transactions': (
        <Card>
          <CardHeader title="Recent transactions" subtitle="Latest account activity" />

          <CardBody className={styles.transactionsBody}>
            <div className={styles.transactionsList} role="table" aria-label="Recent transactions">
              <div className={styles.transactionsRow} role="row">
                <span role="columnheader">Merchant</span>

                <span role="columnheader">Amount</span>

                <span role="columnheader">Date</span>
              </div>

              {recentTransactions.length ? (
                recentTransactions.map((transaction) => (
                  <div
                    key={`${transaction.payee}-${transaction.date}`}
                    className={styles.transactionsRow}
                    role="row"
                  >
                    <span role="cell">{transaction.payee}</span>
                    <span role="cell">{transaction.amount}</span>
                    <span role="cell">{transaction.date}</span>
                  </div>
                ))
              ) : (
                <div className={patterns.emptyState}>
                  Recent transactions will surface as activity is ingested.
                </div>
              )}
            </div>

            <button type="button" className={controls.button}>
              View all transactions
            </button>
          </CardBody>
        </Card>
      ),

      'alerts-reminders': (
        <Card>
          <CardHeader
            title="Alerts & reminders"
            subtitle={`You have ${alerts.length} new notifications`}
          />

          <CardBody className={styles.alertsBody}>
            {alerts.length ? (
              alerts.map((alert) => (
                <div
                  key={alert.title}
                  className={`${styles.alert} ${alertToneClassName[alert.tone]}`}
                >
                  <div>
                    <strong className={styles.alertTitle}>{alert.title}</strong>
                    <p className={styles.alertDescription}>{alert.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className={patterns.emptyState}>
                No alerts yet. We will notify you as reminders come due.
              </div>
            )}
          </CardBody>
        </Card>
      ),

      'quick-actions': (
        <Card>
          <CardHeader title="Quick actions" subtitle="Jump back into common workflows" />

          <CardBody className={styles.quickActions}>
            {quickActions.length ? (
              quickActions.map((action) => (
                <div key={action.label} className={styles.quickAction}>
                  <div className={styles.quickActionText}>
                    <span>{action.label}</span>
                    <p className={styles.quickActionDescription}>{action.description}</p>
                  </div>
                  <button
                    type="button"
                    className={`${controls.button} ${action.primary ? controls.buttonPrimary : ''}`}
                  >
                    {action.cta}
                  </button>
                </div>
              ))
            ) : (
              <div className={patterns.emptyState}>
                Add quick actions to surface high-value workflows.
              </div>
            )}
          </CardBody>
        </Card>
      ),
    };
  }, [data]);

  if (!data) {
    return (
      <section id="dashboard" className={styles.section} aria-busy={isLoading}>
        <div className={styles.loadingState}>Loading dashboard overview...</div>
      </section>
    );
  }

  const { kpis } = data;

  const widgetContent = widgetContentMap!;

  const renderWidget = (id: DashboardWidgetId) => widgetContent[id];

  const activeOverlay = activeWidget ? renderWidget(activeWidget) : null;

  const customizeMessage = isCustomizing
    ? 'Drag cards into the order you prefer. Changes save automatically for your account.'
    : 'Organise the dashboard so the insights you care about stay on top.';

  return (
    <section id="dashboard" className={styles.section}>
      <div className={styles.customizeBar} role="region" aria-live="polite">
        <p className={styles.customizeMessage}>{customizeMessage}</p>

        <div className={styles.customizeActions}>
          {isCustomizing ? (
            <>
              <button type="button" className={controls.button} onClick={handleResetLayout}>
                Reset to default
              </button>

              <button
                type="button"
                className={`${controls.button} ${controls.buttonDanger}`}
                onClick={handleCancelCustomizing}
              >
                Cancel
              </button>

              <button
                type="button"
                className={`${controls.button} ${controls.buttonPrimary}`}
                onClick={handleFinishCustomizing}
              >
                Done customizing
              </button>
            </>
          ) : (
            <button
              type="button"
              className={controls.button}
              onClick={handleStartCustomizing}
              disabled={!isHydrated}
            >
              Customize layout
            </button>
          )}
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {kpis.length ? (
          kpis.map((item) => (
            <div key={item.label} className={patterns.kpi}>
              <div className={patterns.kpiLabel}>{item.label}</div>
              <div className={patterns.kpiValue}>{item.value}</div>
              <div
                className={`${patterns.kpiDelta} ${
                  item.variant === 'up' ? patterns.kpiDeltaUp : patterns.kpiDeltaDown
                }`}
              >
                {item.delta}
              </div>
            </div>
          ))
        ) : (
          <div className={patterns.emptyState}>
            KPI data will appear once platform analytics are flowing.
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={styles.overviewGrid}>
          <DashboardColumn column="primary" items={layout.primary} isCustomizing={isCustomizing}>
            {layout.primary.map((widgetId) => (
              <SortableWidget
                key={widgetId}
                widgetId={widgetId}
                column="primary"
                label={widgetLabelMap[widgetId]}
                isCustomizing={isCustomizing}
              >
                {renderWidget(widgetId)}
              </SortableWidget>
            ))}
          </DashboardColumn>

          <DashboardColumn
            column="secondary"
            items={layout.secondary}
            isCustomizing={isCustomizing}
          >
            {layout.secondary.map((widgetId) => (
              <SortableWidget
                key={widgetId}
                widgetId={widgetId}
                column="secondary"
                label={widgetLabelMap[widgetId]}
                isCustomizing={isCustomizing}
              >
                {renderWidget(widgetId)}
              </SortableWidget>
            ))}
          </DashboardColumn>
        </div>

        <DragOverlay dropAnimation={null}>
          {activeOverlay ? <div className={styles.dragOverlay}>{activeOverlay}</div> : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
