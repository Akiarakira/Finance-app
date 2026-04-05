import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'No authenticated user',
        userError: userError?.message 
      }, { status: 401 });
    }
    
    console.log('Debug: Current user:', user.id);
    
    // Check wallets table
    const { data: allWallets, error: allWalletsError } = await supabase
      .from('wallets')
      .select('*');
    
    console.log('All wallets:', allWallets);
    
    // Check wallet_permissions table
    const { data: allPermissions, error: allPermissionsError } = await supabase
      .from('wallet_permissions')
      .select('*');
    
    console.log('All permissions:', allPermissions);
    
    // Check user's wallets directly
    const { data: userWallets, error: userWalletsError } = await supabase
      .from('wallets')
      .select('*')
      .eq('created_by', user.id);
    
    console.log('User wallets:', userWallets);
    
    // Check user's permissions
    const { data: userPermissions, error: userPermissionsError } = await supabase
      .from('wallet_permissions')
      .select('*')
      .eq('user_id', user.id);
    
    console.log('User permissions:', userPermissions);
    
    return NextResponse.json({ 
      success: true,
      userId: user.id,
      data: {
        allWallets: allWallets || [],
        allWalletsError: allWalletsError?.message,
        allPermissions: allPermissions || [],
        allPermissionsError: allPermissionsError?.message,
        userWallets: userWallets || [],
        userWalletsError: userWalletsError?.message,
        userPermissions: userPermissions || [],
        userPermissionsError: userPermissionsError?.message,
      }
    });
    
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: 'Debug API failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
