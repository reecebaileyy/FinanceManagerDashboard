import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { TransactionsSection } from './transactions-section';

describe('TransactionsSection', () => {
  it('filters transactions by search term', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsSection />);

    const searchInput = screen.getByPlaceholderText('Search transactions');
    await user.clear(searchInput);
    await user.type(searchInput, 'coffee');

    expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument();
    expect(screen.queryByText('Whole Foods Market')).not.toBeInTheDocument();
  });

  it('sorts transactions by amount when toggled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsSection />);

    const table = screen.getByRole('table');
    const amountHeader = screen.getByRole('button', { name: /Amount/ });

    await user.click(amountHeader);
    let rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Blue Bottle Coffee')).toBeInTheDocument();

    await user.click(amountHeader);
    rows = within(table).getAllByRole('row').slice(1);
    expect(within(rows[0]).getByText('Acme Corp Payroll')).toBeInTheDocument();
  });

  it('applies bulk tag updates to selected transactions', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsSection />);

    await user.click(screen.getByLabelText('Select Blue Bottle Coffee'));
    await user.click(screen.getByLabelText('Select Whole Foods Market'));

    await user.click(screen.getByRole('button', { name: 'Bulk edit tags' }));

    const modal = screen.getByRole('dialog', { name: 'Bulk edit tags' });
    const addTagsInput = within(modal).getByLabelText('Add tags');
    await user.type(addTagsInput, 'family');
    await user.click(within(modal).getByRole('button', { name: 'Apply updates' }));

    await waitFor(() =>
      expect(screen.getByText(/Updated 2 transactions successfully/i)).toBeInTheDocument(),
    );
  });

  it('adds queued imports to the recent imports list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<TransactionsSection />);

    await user.click(screen.getByRole('button', { name: 'Import transactions' }));

    const modal = screen.getByRole('dialog', { name: 'Import transactions' });
    const fileInput = within(modal).getByLabelText(/CSV file/);
    const accountSelect = within(modal).getByLabelText('Account');

    const file = new File(['date,description,amount\n'], 'new-import.csv', { type: 'text/csv' });
    await user.upload(fileInput, file);
    await user.selectOptions(accountSelect, 'Everyday Checking');
    await user.click(within(modal).getByRole('button', { name: 'Queue import' }));

    await waitFor(() =>
      expect(screen.getByText(/Import queued for new-import\.csv/i)).toBeInTheDocument(),
    );
  });
});
