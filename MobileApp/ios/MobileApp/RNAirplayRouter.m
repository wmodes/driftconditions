#import "RNAirplayRouter.h"
#import <AVKit/AVKit.h>

@implementation RNAirplayRouter

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(showRoutePicker) {
  dispatch_async(dispatch_get_main_queue(), ^{
    AVRoutePickerView *picker = [[AVRoutePickerView alloc] init];
    for (UIView *subview in picker.subviews) {
      if ([subview isKindOfClass:[UIButton class]]) {
        [(UIButton *)subview sendActionsForControlEvents:UIControlEventTouchUpInside];
        break;
      }
    }
  });
}

@end
