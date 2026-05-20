package sample;

import javafx.animation.Animation;
import javafx.animation.Interpolator;
import javafx.animation.RotateTransition;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.geometry.Pos;
import javafx.scene.Node;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.effect.DropShadow;
import javafx.scene.effect.Reflection;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.Pane;
import javafx.scene.layout.StackPane;
import javafx.scene.paint.Color;
import javafx.scene.paint.CycleMethod;
import javafx.scene.paint.LinearGradient;
import javafx.scene.paint.Stop;
import javafx.scene.shape.Ellipse;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.awt.*;

public class Gui extends Application {

    @Override
    public void start(Stage primaryStage) throws Exception{

        StackPane pane = new StackPane();

        // SCENE FROM FXML FILE
        Parent root = FXMLLoader.load(getClass().getResource("sample.fxml"));

        pane.getChildren().addAll(root);

        Scene scene = new Scene(pane, 650, 400, Color.BLACK); // note 300x275 is the small size when not maximized

        primaryStage.setTitle("Hello World");
        primaryStage.setScene(scene);
        primaryStage.setMaximized(true);

        //primaryStage.setFullScreen(true);
        primaryStage.show();
    }

    public static void rotateThis(Node thisObject) {
        RotateTransition rotate = new RotateTransition(Duration.millis(500), thisObject);
        rotate.setToAngle(360);
        rotate.setFromAngle(0);
        rotate.setInterpolator(Interpolator.LINEAR);

        thisObject.setOnMouseClicked(mouseEvent -> {
            if (rotate.getStatus().equals(Animation.Status.RUNNING)) {
                rotate.pause();
            } else {
                rotate.play();
            }
        });
    }


    public static void launcher(String[] args) {
        launch(args);
    }
}
