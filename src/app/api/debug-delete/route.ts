import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { walletId } = await request.json();
    
    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
    }

    // Check if service role key is available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasServiceRoleKey = !!serviceRoleKey;

    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'No authenticated user' }, { status: 401 });
    }

    console.log('=== DEBUG DELETE START ===');
    console.log('Wallet ID:', walletId);
    console.log('User ID:', user.id);

    // Check if wallet exists
    const { data: wallet, error: walletCheckError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', walletId)
      .single();

    console.log('Wallet exists:', !!wallet);
    console.log('Wallet data:', wallet);
    console.log('Wallet check error:', walletCheckError);

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // Check permissions
    const { data: permissions, error: permError } = await supabase
      .from('wallet_permissions')
      .select('*')
      .eq('wallet_id', walletId);

    console.log('Permissions:', permissions);
    console.log('Permissions error:', permError);

    // Check if there are related records (transactions, etc.)
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('id')
      .eq('wallet_id', walletId)
      .limit(5);

    console.log('Related transactions:', transactions?.length || 0);
    console.log('Transactions error:', transError);

    // Try to delete permissions first
    console.log('Attempting to delete permissions...');
    const { error: permDeleteError, data: permDeleteData } = await supabase
      .from('wallet_permissions')
      .delete()
      .eq('wallet_id', walletId)
      .select();

    console.log('Permission delete error:', permDeleteError);
    console.log('Permission delete data:', permDeleteData);

    // Try to delete wallet
    console.log('Attempting to delete wallet...');
    const { error: walletDeleteError, data: walletDeleteData } = await supabase
      .from('wallets')
      .delete()
      .eq('id', walletId)
      .select();

    console.log('Wallet delete error:', walletDeleteError);
    console.log('Wallet delete data:', walletDeleteData);

    // Verify deletion
    const { data: remainingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('id', walletId)
      .single();

    console.log('Wallet still exists after deletion attempt:', !!remainingWallet);

    console.log('=== DEBUG DELETE END ===');

    return NextResponse.json({
      success: !remainingWallet,
      walletExisted: !!wallet,
      walletData: wallet,
      permissionsCount: permissions?.length || 0,
      permissions: permissions,
      transactionsCount: transactions?.length || 0,
      permissionDeleteError: permDeleteError ? {
        message: permDeleteError.message,
        details: permDeleteError.details,
        hint: permDeleteError.hint,
        code: permDeleteError.code
      } : null,
      permissionDeleteData: permDeleteData,
      walletDeleteError: walletDeleteError ? {
        message: walletDeleteError.message,
        details: walletDeleteError.details,
        hint: walletDeleteError.hint,
        code: walletDeleteError.code
      } : null,
      walletDeleteData: walletDeleteData,
      walletStillExists: !!remainingWallet,
      hasServiceRoleKey: hasServiceRoleKey,
      serviceRoleKeyConfigured: hasServiceRoleKey
    });

  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
