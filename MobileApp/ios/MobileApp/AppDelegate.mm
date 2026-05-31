#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <GoogleCast/GoogleCast.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"MobileApp";
  self.initialProps = @{};

  // Initialize Google Cast SDK
  GCKDiscoveryCriteria *criteria = [[GCKDiscoveryCriteria alloc] initWithApplicationID:@"2BC05BE5"];
  GCKCastOptions *options = [[GCKCastOptions alloc] initWithDiscoveryCriteria:criteria];
  options.physicalVolumeButtonsWillControlDeviceVolume = YES;
  [GCKCastContext setSharedInstanceWithOptions:options];
  [[GCKCastContext sharedInstance].discoveryManager startDiscovery];

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
