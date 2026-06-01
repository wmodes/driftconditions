#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <GoogleCast/GoogleCast.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"MobileApp";
  self.initialProps = @{};

  GCKDiscoveryCriteria *criteria = [[GCKDiscoveryCriteria alloc] initWithApplicationID:kGCKDefaultMediaReceiverApplicationID]; // TEST
  GCKCastOptions *options = [[GCKCastOptions alloc] initWithDiscoveryCriteria:criteria];
  [GCKCastContext setSharedInstanceWithOptions:options];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  [[RCTBundleURLProvider sharedSettings] setJsLocation:@"localhost:8084"];
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
